import { useState, useEffect, useMemo } from "react";
import { Wallet, ethers, providers } from "ethers";
import usdcAbi from "../abi/usdc.json";
import { walletClientToSigner } from '../utils/common'
import { config } from "dotenv"
import {
  convertEthersSignerToAccountSigner,
} from "@alchemy/aa-ethers";
import { createSplitRpcClient } from "../utils/client";

import {
  SimpleSmartContractAccount,
  SmartAccountProvider,
} from "@alchemy/aa-core";
import {getWalletClient, type WalletClient} from "@wagmi/core"

import { Chain } from "viem";
import { useNetwork } from "wagmi";

config()

const entryPoint = "0x33a07c35557De1e916B26a049e1165D47d462f6B";
const simpleAccountFactory = "0x7E072a60c7297bD9d027B2a43cD0C27559aF2f58"
const dumbPaymaster = "0xd198a6f2B3D07a03161FAB8006502e911e5c548e";
const stagingUSDC = "0xAeE02dB1c65ce17211252f7eba0CDCcA07E95548"

const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_URL!

const rpcUrl = process.env.NEXT_PUBLIC_L2_RPC!; // Lyra staging (important?)


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

const etherProvider = new providers.JsonRpcProvider(rpcUrl)
const usdcContract = new ethers.Contract(stagingUSDC, usdcAbi, etherProvider);


export function useSmartWallet() {

  const network = useNetwork()

  const [smartAccountAddress, setSmartAccountAddress] = useState<string | undefined>(undefined)

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
  }, [network.chains])

  // async: setup smart account provider
  useEffect(() => {
    async function setupSmartAccountProvider() {
      if (!walletClient) return
      const signer = walletClientToSigner(walletClient)
      if (!signer._isSigner) return

      const owner = convertEthersSignerToAccountSigner(signer as Wallet)

      const provider = new SmartAccountProvider(
        createSplitRpcClient(bundlerUrl, rpcUrl, lyraChain),
        entryPoint,
        lyraChain
      ).connect(
        (rpcClient) =>
          new SimpleSmartContractAccount({
            entryPointAddress: entryPoint,
            chain: lyraChain,
            factoryAddress: simpleAccountFactory,
            rpcClient: rpcClient,
            owner,
            accountAddress: rpcClient.account,
          })
      );
      setProvider(provider)
      const addr = await provider.getAddress()
      setSmartAccountAddress(addr)
    }
    setupSmartAccountProvider()

  }, [walletClient])


  async function sendERC20(transferAmount: string) {

    // get the connected wallet (signer)
    if (provider === undefined) return
    

    // 2. build transaction: random send usdc tx
    const target = stagingUSDC; // usdc address
    const data = usdcContract.interface.encodeFunctionData("transfer(address,uint256)", [
      '0x7c54F6e650e5AA71112Bfd293b8092717953aF28', // recipient
      transferAmount,
    ]) as `0x${string}`

    // 3. send a UserOperation
    const { hash } = await provider.withPaymasterMiddleware({
      dummyPaymasterDataMiddleware: async () => {return {paymasterAndData: dumbPaymaster}},
      paymasterDataMiddleware: async () => {return {paymasterAndData: dumbPaymaster}},
    }).sendUserOperation({
      target,
      data,
      value: BigInt(0)
    });

    console.log(`UserOpHash: ${hash}`);
  }

  return { sendERC20, walletReady, provider, smartAccountAddress }
}