import { useState, useEffect, useMemo } from "react";

import { hexToBigInt } from 'viem'

import {getWalletClient, type WalletClient} from "@wagmi/core"

import { useAccount, useNetwork } from "wagmi";
import { config } from "dotenv"

config()

import bridgeAbi from "../abi/bridge.json";
import { BigNumber } from "ethers";

// const staging = {
//   bridge: "0x5a6afB532D5F8788fe4CaB9300e55918548FA1bE" as `0x${string}`,
// }

const testnet = {
  bridge: "0x915f179A77FB2e1AeA8b56Ebc0D75A7e1A8a7A17" as `0x${string}`,
}

const addresses = testnet;


// Usual ethers provider just to fetch L2 data

export function useBridge() {

  const network = useNetwork()
  const {address: connectedEOA} = useAccount()

  const [txHash, setTxHash] = useState<string | undefined>(undefined)

  const [walletClient, setWalletClient] = useState<WalletClient | undefined>(undefined)
  
  useEffect(() => {

  })

  // async: setup wagmi wallet client
  useEffect(() => {
    async function updateClient() {
      const walletClient = await getWalletClient({ chainId: 11155111 }) as WalletClient
      setWalletClient(walletClient)
    }
    updateClient()
  }, [network.chains, connectedEOA])

  /**
   * @dev bridge eth to L2
   * @returns 
   */
  async function bridgeETHTo(destination: string, ethAmount: bigint, txConfirmedCallback?: Function, errorCallback?: Function) {
    try {

    
    if (!walletClient) return
    const hash = await walletClient.writeContract({
      address: addresses.bridge,
      abi: bridgeAbi,
      functionName: 'bridgeETHTo',
      args: [destination, '0', '0x00'], // destination, minGasLimit, extraData
      value: ethAmount
    })
    
    if (txConfirmedCallback) txConfirmedCallback(hash)
    } catch (e: unknown) {
  console.log({e})
      if (errorCallback) {
        (e as any).message
          ? errorCallback((e as any).message) 
          : errorCallback(e)
      } else {
        console.error(e)
      }
    }
  }


  return { bridgeETHTo }
}