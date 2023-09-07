// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { createWalletClient, encodeFunctionData } from 'viem'
import { http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts' 

import usdcAbi from '../../abi/usdc.json'
import {testnet as addresses} from "../../utils/addresses"
import { lyraChain } from '../../utils/chain'

const rpc = process.env.NEXT_PUBLIC_L2_RPC! 
const privateKey = process.env.FAUCET_PRIVATE_KEY! as `0x${string}`


const transport = http(rpc)

const client = createWalletClient({
  chain: lyraChain,
  transport: transport 
})

const account = privateKeyToAccount(privateKey)

type Data = {
  name: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {

  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const amount = '1000000000' // 1K USDC

  if (!req.body.recipient) res.status(400).json({ success: false, message: 'recipient is required' } as any);

  try {
    const hash = await client.sendTransaction({
      account,
      to: addresses.usdc,
      data: encodeFunctionData({ abi: usdcAbi, functionName: 'mint', args: [req.body.recipient, amount] }),
      chain: lyraChain,
    })

    res.status(200).json({ success: true, hash } as any)
  } catch (e) {
    return res.status(500).json({ success: false, message: e } as any);
  }
  
}
