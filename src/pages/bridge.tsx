
import { Button, Input } from '@chakra-ui/react'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useSmartWallet } from "../hooks/useSmartWallet"
import { useBridge } from "../hooks/useBridge"
import { useToast } from '@chakra-ui/react'
import { useAccount } from 'wagmi'
import Image from 'next/image'


import lyraLogo from '../imgs/lyra.png'
import { useState } from 'react'
const Home: NextPage = () => {

  const toast = useToast();

  const { address } = useAccount()

  const { smartAccountAddress, walletReady } = useSmartWallet()

  const { bridgeETHTo } = useBridge()

  const [depositAmount, setDepositAmount] = useState<string>('');
  
  const handleBridgeETHTo = async () => {
    const l2Address = smartAccountAddress;
    if (!l2Address) return
    const ethAmount = '100000000000000000';
    await bridgeETHTo(l2Address, ethAmount, () => toast({ title: 'Tx confirmed' }))
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Bridge</title>
        <meta name="description" content="ETH + Next.js DApp Boilerplate by ilyxium" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h3 className={styles.title} style={{ padding: 20 }}>
          Lyra Bridge
        </h3>
        <p className='hex' style={{fontSize:14}}>
          You can deposit ETH onto your Lyra chain addresses from Sepolia
        </p>
        
        <p className='hex' style={{fontSize: 14}}>
          Having eth allows you to deploy contracts / trade directly with others outside of the CLOB on chain
        </p>
        
        <Image src={lyraLogo} alt="lyra logo" width="100" height="100" />

        <p className='hex'>
          L2 EOA: {address ? address : 'not connected'}
        </p>
        <p className='hex'>
          L2 SCW: {smartAccountAddress ? smartAccountAddress : address ? 'loading...' : 'not connected'}
        </p>

        <br />
        
        <div className={styles.grid}>
          <Input 
            value={depositAmount} 
            width={200}
            onChange={(event) => setDepositAmount(event.target.value)}>
          </Input>
          <Button
           // purple
            backgroundColor="#AFE1AF"
            borderRadius="7px"
            margin={2.5}
            _hover={{
              bg: '#5F8575'
            }}
            _active={{
              bg: '#5F8575'
            }}
            disabled={!walletReady}
            onClick={() => handleBridgeETHTo()}
          >
            <p>Bridge ETH to SCW</p>
          </Button>
        </div>

      </main>
    </div>
  )
}

export default Home
