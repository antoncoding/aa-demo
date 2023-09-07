
import { Button, Spinner } from '@chakra-ui/react'
import { RepeatIcon } from '@chakra-ui/icons'
import Image from 'next/image'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useSmartWallet } from "../hooks/useSmartWallet"
import { useToast } from '@chakra-ui/react'
import { useAccount } from 'wagmi'
import { useState } from 'react'
import pepe from '../imgs/pepe.gif'

const Home: NextPage = () => {

  const toast = useToast();

  const { address } = useAccount()

  const { sendERC20, walletReady, smartAccountAddress, usdcBalance, txHash, enableTrading, refreshUSDCBalance } = useSmartWallet()

  const [isFaucetLoading, setIsFaucetLoading] = useState(false)

  const handleClickSendERC20 = async () => {
    await sendERC20('50000000',
      () => toast({ title: 'Tx Sent To bundler' }),
      () => toast({ title: 'Tx confirmed' }))
  }

  const handleEnableTrading = async () => {
    const initDepositAmount = '100000000';
    await enableTrading(initDepositAmount, () => toast({ title: 'Tx confirmed' }))
  }

  const handleMintFaucet = async () => {
    setIsFaucetLoading(true)
    try {
      const response = await fetch('/api/faucet', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipient: smartAccountAddress })
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'USDC Sent', description: <p className='hex' style={{fontSize: 14, paddingRight: 20}}>{data.hash}</p>})
      } else {
        toast({ title: 'Error', description: data.message, status: 'error'})
      }
    } catch { } finally {
      setIsFaucetLoading(false)
    }
  }

  
  return (
    <div className={styles.container}>
      <Head>
        <title>Lyra V2 Alpha</title>
        <meta name="description" content="ETH + Next.js DApp Boilerplate by ilyxium" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <h3 className={styles.title} style={{ padding: 20 }}>
          V2 is Coming...
        </h3>
        <Image width={400} src={pepe} alt="pepe" />

        <p className='hex'>
          EOA: {address ? address : 'not connected'}
        </p>
        <p className='hex'>
          SCW: {smartAccountAddress ? smartAccountAddress : address ? 'loading...' : 'not connected'}
        </p>
        <span style={{display: 'flex'}}>
        <p className='hex'>
          USDC Balance: {usdcBalance ? usdcBalance : 'loading...'} <RepeatIcon _hover={{color: '#56C3A9E6'}} onClick={() => refreshUSDCBalance()}/>
        </p>
        
        </span>
        <Button
            backgroundColor="#56C3A9E6"
            borderRadius="7px"
            textColor={"white"}
            margin={2.5}
            _hover={{
              bg: '#121212'
            }}
            _active={{
              bg: '#121212'
            }}
            disabled={!walletReady}
            onClick={() => handleMintFaucet()}
          >
            {isFaucetLoading ? <Spinner /> : <p>Get 1000 USDC</p>}
          </Button>

        <br />

        <h4 className={styles.title} style={{ padding: 20, fontSize: 24 }}>
          Try ERC-4337 Gasless Transactions
        </h4>

        <div className={styles.grid}>

          <Button
            backgroundColor="#56C3A9E6"
            borderRadius="7px"
            textColor={"white"}
            margin={2.5}
            _hover={{
              bg: '#121212'
            }}
            _active={{
              bg: '#121212'
            }}
            disabled={!walletReady}
            onClick={() => handleClickSendERC20()}
          >
            <p>Send 50 USDC</p>
          </Button>

          <Button
            backgroundColor="#56C3A9E6"
            borderRadius="7px"
            textColor={"white"}
            margin={2.5}
            _hover={{
              bg: '#121212'
            }}
            _active={{
              bg: '#121212'
            }}
            disabled={!walletReady}
            onClick={() => handleEnableTrading()}
          >
            <p>Enable Trading</p>
          </Button>
        </div>

        <p className='hex'>
          txHash: {txHash ? txHash : '-'}
        </p>
      </main>
    </div>
  )
}

export default Home
