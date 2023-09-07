
import { Button } from '@chakra-ui/react'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useSmartWallet } from "../hooks/useSmartWallet"
import { useToast } from '@chakra-ui/react'
import { useAccount } from 'wagmi'

const Home: NextPage = () => {

  const toast = useToast();

  const { address } = useAccount()

  const { sendERC20, walletReady, smartAccountAddress, usdcBalance, txHash, enableTrading } = useSmartWallet()

  const handleClickSendERC20 = async () => {
    await sendERC20('5000000',
      () => toast({ title: 'Tx Sent To bundler' }),
      () => toast({ title: 'Tx confirmed' }))
  }

  const handleEnableTrading = async () => {
    const initDepositAmount = '100000000';
    await enableTrading(initDepositAmount, () => toast({ title: 'Tx confirmed' }))
  }

  const handleMintFaucet = async () => {
    const response = await fetch('/api/faucet', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipient: smartAccountAddress })
    });
    const data = await response.json();
    console.log({data})
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
        
        <br />

        <p className='hex'>
          EOA: {address ? address : 'not connected'}
        </p>
        <p className='hex'>
          SCW: {smartAccountAddress ? smartAccountAddress : address ? 'loading...' : 'not connected'}
        </p>
        <p className='hex'>
          USDC Balance: {usdcBalance ? usdcBalance : 'loading...'}
        </p>
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
            <p>Get 1000 USDC</p>
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
            <p>Send 5 USDC</p>
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
