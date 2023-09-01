import { useState } from "react";
import { Wallet, ethers } from "ethers";
import { BundlerJsonRpcProvider, IUserOperationMiddlewareCtx } from "userop";
import usdcAbi from "../abi/usdc.json";
import { getEthersSigner } from '../utils/common'
import { config } from "dotenv"
import {
  convertEthersSignerToAccountSigner,
} from "@alchemy/aa-ethers";
import { createSplitRpcClient } from "../utils/client";
import { usePublicClient } from "wagmi"


import {
  SimpleSmartContractAccount,
  SmartAccountProvider,
} from "@alchemy/aa-core";
import { Chain } from "viem";
import { useAccount } from "wagmi"
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

const etherProvider = new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(bundlerUrl);
const usdcContract = new ethers.Contract(stagingUSDC, usdcAbi, etherProvider);

// apply our own dumb paymaster: pay for anyone
const paymasterMiddleware: (context: IUserOperationMiddlewareCtx) => Promise<void> = async (context) => {
  context.op.paymasterAndData = dumbPaymaster;
  // previously only 21000, need to add more (adding 30000)
  // context.op.preVerificationGas = BigNumber.from(context.op.preVerificationGas).add(BigNumber.from(1000000));

  // // need to update callGasLimit as well
  // context.op.callGasLimit = BigNumber.from(context.op.callGasLimit).add(BigNumber.from(1000000));
}


export function useSmartWallet() {

  const { address } = useAccount()
  console.log("address 22", address)


  const client = usePublicClient()
  client.request = client.request.bind(client)


  async function sendERC20(transferAmount: string) {

    const signer = await getEthersSigner({ chainId: 5 })
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

    // build transaction: random send usdc tx
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

  return { sendERC20 }
}