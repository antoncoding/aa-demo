// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { createWalletClient, fromHex, encodeAbiParameters, keccak256 } from 'viem'

import {testnet as addresses} from "../../utils/addresses"

let elliptic = require('elliptic');
let ec = new elliptic.ec('secp256k1');

const privateKey = process.env.FAUCET_PRIVATE_KEY! as `0x${string}`

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

  if (!req.body.userOp) res.status(400).json({ success: false, message: 'userOps is required' } as any);

  const userOp = req.body.userOp

  try {
    const keyPair = ec.keyFromPrivate(privateKey.replace('0x', ''))
    const privKey = keyPair.getPrivate("hex");
    
    const encodedData = encodeAbiParameters(
      [
        { name: 'calldata', type: 'bytes' },
        { name: 'sender', type: 'address' },
        { name: 'maxFeePerGas', type: 'uint256' }
      ],
      [
        userOp.callData as `0x{string}`, 
        userOp.sender as `0x{string}`, 
        fromHex(userOp.maxFeePerGas, 'bigint')
      ]
    )

    const msgHash = keccak256(encodedData)

    // slice the 0x
    const signature = ec.sign(msgHash.slice(2), privKey, "hex", {canonical: true});
    
    const finalSig = signature.r.toString('hex') + signature.s.toString('hex') + (signature.recoveryParam + 27).toString(16)
    
    const paymasterData = addresses.signaturePaymaster + finalSig
    
    res.status(200).json({ success: true, paymasterData: paymasterData } as any)
  } catch (e) {
    return res.status(500).json({ success: false, message: e } as any);
  }
  
}
