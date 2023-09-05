import { useState, useEffect, useMemo } from "react";
import { BigNumber, Wallet, ethers, providers } from "ethers";

import { walletClientToSigner } from '../utils/common'
import {
  convertEthersSignerToAccountSigner,
} from "@alchemy/aa-ethers";
import { createSplitRpcClient } from "../utils/client";
import { encodeFunctionData } from 'viem'

import {
  SimpleSmartContractAccount,
  SmartAccountProvider,
} from "@alchemy/aa-core";
import {getWalletClient, type WalletClient} from "@wagmi/core"

import { Chain, RpcTransactionRequest } from "viem";
import { useAccount, useNetwork } from "wagmi";
import { config } from "dotenv"
import { RpcRequest } from "viem/dist/types/utils/rpc";

config()

import usdcAbi from "../abi/usdc.json";
import matchingAbi from "../abi/matching.json";
import cashAbi from "../abi/cash.json";
import subAccountsAbi from "../abi/subAccounts.json";

// switching between staging / testnet prod
// const staging = {
//   entryPoint: "0x33a07c35557De1e916B26a049e1165D47d462f6B" as `0x${string}`,
//   simpleAccountFactory: "0x4AAb2566a215873f5c98B1034dF1cB57E201B7BE" as `0x${string}`, // older version (0.4)
//   dumbPaymaster: "0xd198a6f2B3D07a03161FAB8006502e911e5c548e" as `0x${string}`,
//   usdc: "0xAeE02dB1c65ce17211252f7eba0CDCcA07E95548" as `0x${string}`,
// }

const testnet = {
  entryPoint: "0xC25Dc675669907Aee390C0144eA8bB3DFd33a4c7" as `0x${string}`,
  simpleAccountFactory: "0xABc1f16fb234fDE9E706D4C6E656365506E67570" as `0x${string}`, // older version (0.4)
  dumbPaymaster: "0xAeE02dB1c65ce17211252f7eba0CDCcA07E95548" as `0x${string}`,
  usdc:"0xe80F2a02398BBf1ab2C9cc52caD1978159c215BD" as `0x${string}`,
  matching: "0x1572A4D707eF2b5341EaF787C4A3f2d225b1B8D7" as `0x${string}`,
  cash: "0x1480Cfe30213b134f757757d328949AAe406eA33" as `0x${string}`,
  depositModule: "0xb004a165b47AECEfA28242ec1aB5B45787eDeb97" as `0x${string}`,
  standardManager: "0x0b3639A094854796E3b236DB08646ffd21C0B1B2" as `0x${string}`,
  subAccounts: "0x0f8BEaf58d4A237C88c9ed99D82003ab5c252c26" as `0x${string}`,
}

const addresses = testnet;

const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_URL!
const rpcUrl = process.env.NEXT_PUBLIC_L2_RPC!;

const randomSessionKey = "0x2489EBF16C8A76a4d0c66743a7fa6Cfb9E434322" // random public key

const lyraChain: Chain = {
  name: "Lyra",
  id: 901,
  network: '901',
  rpcUrls: {
    default: {
      http: [rpcUrl],
      webSocket: [rpcUrl.replace("http", "ws")],
    },
    public: {
      http: [rpcUrl],
      webSocket: [rpcUrl.replace("http", "ws")],
    }
  },
  nativeCurrency: {
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
  }
}

// Usual ethers provider just to fetch L2 data
const etherProvider = new providers.JsonRpcProvider(rpcUrl)
const usdcContract = new ethers.Contract(addresses.usdc, usdcAbi, etherProvider);
const subAccounts = new ethers.Contract(addresses.subAccounts, subAccountsAbi, etherProvider);

export function useSmartWallet() {

  const network = useNetwork()
  const connectedWallet = useAccount()

  const [smartAccountAddress, setSmartAccountAddress] = useState<string | undefined>(undefined)
  const [usdcBalance, setUSDCBalance] = useState<string | undefined>(undefined)
  
  const [opHash, setOpHash] = useState<string | undefined>(undefined)
  const [txHash, setTxHash] = useState<string | undefined>(undefined)

  const [walletClient, setWalletClient] = useState<WalletClient | undefined>(undefined)
  const [provider, setProvider] = useState<SmartAccountProvider | undefined>(undefined)

  const walletReady = useMemo(() => walletClient !== undefined, [walletClient?.account]) 

  // async: setup wagmi wallet client
  useEffect(() => {
    async function updateClient() {
      const walletClient = await getWalletClient({ chainId: 5 }) as WalletClient
      setWalletClient(walletClient)
    }
    updateClient()
  }, [network.chains, connectedWallet.address])

  // async: setup smart account provider
  useEffect(() => {
    async function setupSmartAccountProvider() {
      if (!walletClient) return
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
      setSmartAccountAddress(addr)

      const balance = await usdcContract.balanceOf(addr)
      setUSDCBalance(ethers.utils.formatUnits(balance, 'mwei')); // 6 decimals
    }
    setupSmartAccountProvider()

  }, [walletClient])

  async function enableTrading(txConfirmedCallback?: Function) {

    if (smartAccountAddress === undefined) return

    const nextSubAccountId = await subAccounts.lastAccountId() as BigNumber
    console.log("nextSubAccountId", nextSubAccountId)

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
        args: [addresses.cash, 1000000000]
      })
    })
  
    // build tx3: deposit + create cash.depositToNewAccount
    txs.push({
      from: smartAccountAddress as `0x${string}`,
      to: addresses.cash,
      data: encodeFunctionData({
        abi: cashAbi,
        functionName: "depositToNewAccount", 
        args: [smartAccountAddress, "100000000", addresses.standardManager] // recipient, stableAmount (100), manager 
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
        args: [nextSubAccountId.add(1).toString()] // notice: this might cuase error when multiple users are signing up at the same time
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
        dummyPaymasterDataMiddleware: async () => {return {paymasterAndData: addresses.dumbPaymaster}}, // this is for verification
        paymasterDataMiddleware: async () => {return {paymasterAndData: addresses.dumbPaymaster}}, // for real tx
      })
      .withCustomMiddleware(async(userOps) => {
        return {
          ...userOps,
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
        dummyPaymasterDataMiddleware: async () => {return {paymasterAndData: addresses.dumbPaymaster}}, // this is for verification
        paymasterDataMiddleware: async () => {return {paymasterAndData: addresses.dumbPaymaster}}, // for real tx
      })
      .withCustomMiddleware(async(userOps) => {
        return {
          ...userOps,
          verificationGasLimit: BigNumber.from(userOps.verificationGasLimit as bigint).mul(2).toString(), // buffer for first time wallet
        }
      })
      .sendTransactions(txs)

    console.log("tx Hash", txHash)
    setTxHash(txHash)
    if (txConfirmedCallback) txConfirmedCallback(txHash)
  }

  return { sendERC20, walletReady, provider, smartAccountAddress, usdcBalance, opHash, txHash, enableTrading }
}