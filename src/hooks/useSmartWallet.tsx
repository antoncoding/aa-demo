import { useState, useEffect, useMemo } from "react";
import { BigNumber, Wallet, ethers, providers } from "ethers";

import { walletClientToSigner } from '../utils/common'
import {
  convertEthersSignerToAccountSigner,
} from "@alchemy/aa-ethers";

import { createSplitRpcClient } from "../utils/client";
import { encodeFunctionData, toHex } from 'viem'

import {
  SimpleSmartContractAccount,
  SmartAccountProvider,
} from "@alchemy/aa-core";
import { getWalletClient, type WalletClient } from "@wagmi/core"

import { RpcTransactionRequest } from "viem";
import { useAccount, useNetwork } from "wagmi";
import { config } from "dotenv"

config()

import usdcAbi from "../abi/usdc.json";
import matchingAbi from "../abi/matching.json";
import cashAbi from "../abi/cash.json";
import subAccountsAbi from "../abi/subAccounts.json";
import { testnet as addresses } from "../utils/addresses"
import { lyraChain } from '../utils/chain'

const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_URL!
const rpcUrl = process.env.NEXT_PUBLIC_L2_RPC!;

const randomSessionKey = "0x2489EBF16C8A76a4d0c66743a7fa6Cfb9E434322" // random public key

// Usual ethers provider just to fetch L2 data
const etherProvider = new providers.JsonRpcProvider(rpcUrl)
const usdcContract = new ethers.Contract(addresses.usdc, usdcAbi, etherProvider);
const subAccounts = new ethers.Contract(addresses.subAccounts, subAccountsAbi, etherProvider);

export function useSmartWallet() {

  const network = useNetwork()
  const { address: connectedEOA } = useAccount()

  const [smartAccountAddress, setSmartAccountAddress] = useState<string | undefined>(undefined)
  const [usdcBalance, setUSDCBalance] = useState<string | undefined>(undefined)
  const [ethBalance, setETHBalance] = useState<string | undefined>(undefined)

  const [opHash, setOpHash] = useState<string | undefined>(undefined)
  const [txHash, setTxHash] = useState<string | undefined>(undefined)

  const [walletClient, setWalletClient] = useState<WalletClient | undefined>(undefined)
  const [provider, setProvider] = useState<SmartAccountProvider | undefined>(undefined)

  const walletReady = useMemo(() => walletClient !== undefined, [walletClient])

  // async: setup wagmi wallet client
  useEffect(() => {
    async function updateClient() {
      const walletClient = await getWalletClient({ chainId: 5 }) as WalletClient
      setWalletClient(walletClient)
    }
    updateClient()
  }, [network.chains, connectedEOA])

  // async: setup smart account provider
  useEffect(() => {
    async function setupSmartAccountProvider() {
      if (!walletClient) {
        setSmartAccountAddress(undefined)
        return
      }
      const signer = walletClientToSigner(walletClient)
      if (!signer._isSigner) return

      const owner = convertEthersSignerToAccountSigner(signer as Wallet)

      const provider = new SmartAccountProvider(
        createSplitRpcClient(bundlerUrl, rpcUrl, lyraChain),
        addresses.entryPoint,
        lyraChain
      ).connect(
        (rpcClient) =>
          new SimpleSmartContractAccount({
            entryPointAddress: addresses.entryPoint,
            chain: lyraChain,
            factoryAddress: addresses.simpleAccountFactory,
            rpcClient: rpcClient,
            owner,
            accountAddress: rpcClient.account,
          })
      );
      setProvider(provider)
      const addr = await provider.getAddress()

      // set address
      setSmartAccountAddress(addr)

      const balance = await usdcContract.balanceOf(addr)
      setUSDCBalance(ethers.utils.formatUnits(balance, 'mwei')); // 6 decimals
    }
    setupSmartAccountProvider()

  }, [walletClient])

  /**
   * @dev send batched tx to create subAccount + deposit USDC
   * @param txConfirmedCallback 
   * @returns 
   */
  async function enableTrading(initAmount: string, txConfirmedCallback?: Function) {
    if (smartAccountAddress === undefined) return

    // todo: replace with a wrapper contract to make sure subAccountIds don't collide
    const nextSubAccountId = await subAccounts.lastAccountId() as BigNumber

    const txs: RpcTransactionRequest[] = []
    // build tx1: register sessionKey
    txs.push({
      from: smartAccountAddress as `0x${string}`,
      to: addresses.matching,
      data: encodeFunctionData({
        abi: matchingAbi,
        functionName: "registerSessionKey",
        args: [randomSessionKey, 1757012653]
      })
    })

    // build tx2: approve cash
    txs.push({
      from: smartAccountAddress as `0x${string}`,
      to: addresses.usdc,
      data: encodeFunctionData({
        abi: usdcAbi,
        functionName: "approve",
        args: [addresses.cash, initAmount]
      })
    })

    // build tx3: deposit + create cash.depositToNewAccount
    txs.push({
      from: smartAccountAddress as `0x${string}`,
      to: addresses.cash,
      data: encodeFunctionData({
        abi: cashAbi,
        functionName: "depositToNewAccount",
        args: [smartAccountAddress, initAmount, addresses.standardManager] // recipient, stableAmount (100), manager 
      })
    })

    // build tx4: approve matching to pull subAccounts
    txs.push({
      from: smartAccountAddress as `0x${string}`,
      to: addresses.subAccounts,
      data: encodeFunctionData({
        abi: subAccountsAbi,
        functionName: "setApprovalForAll",
        args: [addresses.matching, true]
      })
    })

    // build: tx5: deposit subAccount into matching
    txs.push({
      from: smartAccountAddress as `0x${string}`,
      to: addresses.matching,
      data: encodeFunctionData({
        abi: matchingAbi,
        functionName: "depositSubAccount",
        args: [nextSubAccountId.add(1).toString()] // notice: this might cause error when multiple users are signing up at the same time
      })
    })
    await sendBatchedTxs(txs, txConfirmedCallback)

  }


  async function sendERC20(transferAmount: string, sendToBundlerCallback?: Function, txConfirmedCallback?: Function) {
    // 1. build erc20 transactions
    const target = addresses.usdc; // usdc address
    const data = usdcContract.interface.encodeFunctionData("transfer(address,uint256)", [
      '0x7c54F6e650e5AA71112Bfd293b8092717953aF28', // random recipient
      transferAmount,
    ]) as `0x${string}`

    // 2. send userOp to bundler 
    await buildAndSendUserOp(target, data, sendToBundlerCallback, txConfirmedCallback)

    // temp: update balance
    const balance = await usdcContract.balanceOf(smartAccountAddress)
    setUSDCBalance(ethers.utils.formatUnits(balance, 'mwei')); // 6 decimals
  }

  async function buildAndSendUserOp(
    target: `0x${string}`,
    data: `0x${string}`,
    sendToBundlerCallback?: Function,
    txConfirmedCallback?: Function
  ) {

    if (provider === undefined) return

    // send to the bundler
    const { hash } = await provider
      .withPaymasterMiddleware({
        dummyPaymasterDataMiddleware: async () => { 
          return { paymasterAndData: addresses.dumbPaymaster } 
        }, // this is for verification
        paymasterDataMiddleware: async (uo) => { 
          const response = await fetch('/api/paymaster', { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userOp: {
              callData: await (uo.callData),
              sender: await (uo.sender),
              maxFeePerGas: toHex(uo.maxFeePerGas as bigint),
            } })
          });
          const data = await response.json();

          return { paymasterAndData: data.paymasterData } 
        }, // for real tx
      })
      .withCustomMiddleware(async (userOps) => {
        return {
          ...userOps,
          preVerificationGas: BigNumber.from(userOps.preVerificationGas as bigint).mul(2).toString(), // buffer for first time wallet
          verificationGasLimit: BigNumber.from(userOps.verificationGasLimit as bigint).mul(2).toString(), // buffer for first time wallet
        }
      })
      .sendUserOperation({
        target,
        data,
        value: BigInt(0),
      });

    console.log(`UserOpHash: ${hash}`);
    setOpHash(hash)
    if (sendToBundlerCallback) sendToBundlerCallback(hash)

    const result = await provider.waitForUserOperationTransaction(hash as `0x${string}`)
    console.log("tx Hash", result)
    setTxHash(result)
    if (txConfirmedCallback) txConfirmedCallback(result)
  }

  async function sendBatchedTxs(
    txs: RpcTransactionRequest[],
    txConfirmedCallback?: Function
  ) {

    if (provider === undefined) return

    // send to the bundler
    const txHash = await provider
      .withPaymasterMiddleware({
        dummyPaymasterDataMiddleware: async () => { 
          return { paymasterAndData: addresses.dumbPaymaster } 
        }, // this is for verification
        paymasterDataMiddleware: async (uo) => { 
          const response = await fetch('/api/paymaster', { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userOp: {
              callData: await (uo.callData),
              sender: await (uo.sender),
              maxFeePerGas: toHex(uo.maxFeePerGas as bigint),
            } })
          });
          const data = await response.json();

          return { paymasterAndData: data.paymasterData } 
        }, // for real tx
      })
      .withCustomMiddleware(async (userOps) => {
        return {
          ...userOps,
          preVerificationGas: BigNumber.from(userOps.preVerificationGas as bigint).mul(2).toString(), // buffer for first time wallet
          verificationGasLimit: BigNumber.from(userOps.verificationGasLimit as bigint).mul(2).toString(), // buffer for first time wallet
        }
      })
      .sendTransactions(txs)

    setTxHash(txHash)
    if (txConfirmedCallback) txConfirmedCallback(txHash)
  }

  async function refreshUSDCBalance() {
    const balance = await usdcContract.balanceOf(smartAccountAddress)
    setUSDCBalance(ethers.utils.formatUnits(balance, 'mwei')); // 6 decimals
  }

  return { sendERC20, walletReady, provider, smartAccountAddress, usdcBalance, opHash, txHash, enableTrading, refreshUSDCBalance }
}