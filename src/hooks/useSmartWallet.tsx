import { useState } from "react";
import { BigNumber, ethers } from "ethers";
import { Client, Presets, BundlerJsonRpcProvider, IUserOperationMiddlewareCtx } from "userop";
import usdcAbi from "../abi/usdc.json";
import { getEthersSigner } from '../utils/common'
import { config } from "dotenv"

config()

const entryPoint = "0x33a07c35557De1e916B26a049e1165D47d462f6B";
const simpleAccountFactory = "0x7E072a60c7297bD9d027B2a43cD0C27559aF2f58"
const dumbPaymaster = "0xd198a6f2B3D07a03161FAB8006502e911e5c548e";
const stagingUSDC = "0xAeE02dB1c65ce17211252f7eba0CDCcA07E95548"

const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_URL!

const rpcUrl = process.env.NEXT_PUBLIC_L2_RPC!; // Lyra staging (important?)

const provider = new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(bundlerUrl);

const usdcContract = new ethers.Contract(stagingUSDC, usdcAbi, provider);

// apply our own dumb paymaster: pay for anyone
const paymasterMiddleware: (context: IUserOperationMiddlewareCtx) => Promise<void> = async (context) => {
  context.op.paymasterAndData = dumbPaymaster;
  // previously only 21000, need to add more (adding 30000)
  context.op.preVerificationGas = BigNumber.from(context.op.preVerificationGas).add(BigNumber.from(1000000));

  // need to update callGasLimit as well
  context.op.callGasLimit = BigNumber.from(context.op.callGasLimit).add(BigNumber.from(1000000));
}


export function useSmartWallet () {
  async function sendERC20(transferAmount: string) {
    const signer = await getEthersSigner({chainId: 5})
    // simpleAccount preset
    const simpleAccount = await Presets.Builder.SimpleAccount.init(
      signer, // Any object compatible with ethers.Signer
      rpcUrl,
      {
        entryPoint: entryPoint,
        factory: simpleAccountFactory,
        overrideBundlerRpc: bundlerUrl,
        paymasterMiddleware: paymasterMiddleware
      }
    );

    const sender = simpleAccount.getSender();
    console.log('sender (smart contract wallet)', sender)

    const client = await Client.init(rpcUrl, { overrideBundlerRpc: bundlerUrl, entryPoint: entryPoint });

    // build transaction: random send usdc tx
    const target = stagingUSDC; // usdc address
    const data = usdcContract.interface.encodeFunctionData("transfer(address,uint256)", [
      '0x7c54F6e650e5AA71112Bfd293b8092717953aF28', // recipient
      transferAmount,
    ])

    const res = await client.sendUserOperation(simpleAccount.execute(target, 0, data));
    
    console.log(`UserOpHash: ${res.userOpHash}`);

    // console.log("Waiting for transaction...");
    const result = await res.wait();
    result?.transactionHash && console.log(`Transaction hash: ${result.transactionHash}`);
  }

  return { sendERC20 }
}