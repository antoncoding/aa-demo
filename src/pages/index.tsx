import { Button } from '@chakra-ui/react'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import {useSmartWallet} from "../hooks/useSmartWallet"
import { useToast } from '@chakra-ui/react'



const Home: NextPage = () => {

  const toast = useToast();

  const { sendERC20, walletReady, smartAccountAddress, usdcBalance, txHash } = useSmartWallet()

  const handleClick = async () => {
    await sendERC20('5000000', 
    () => toast({title:'Tx Sent To bundler'}), 
    () => toast({title:'Tx confirmed'}))
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Lyra Account Abstraction!</title>
        <meta name="description" content="ETH + Next.js DApp Boilerplate by ilyxium" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h3 className={styles.title}>
          Hola!
        </h3>

        <p style={{padding: 20}}>
          Smart Account Address: {smartAccountAddress ? smartAccountAddress : 'loading...'}
        </p>
        <p style={{padding: 20}}>
          USDC Balance: {usdcBalance ? usdcBalance : 'loading...'}
        </p>
    
        <div className={styles.grid}>

          <Button
              backgroundColor="#32CD32"
              borderRadius="25px"
              margin={2.5}
              _hover={{
                bg: '#121212'
              }}
              _active={{
                bg: '#121212'
              }}
              disabled={!walletReady}
              onClick={() => handleClick()}
            >
              <p>Send 5 USDC</p>
            </Button>
        </div>

        <p style={{padding: 20}}>
          txHash: {txHash ? txHash : 'no userOp sent'}
        </p>
      </main>
    </div>
  )
}

export default Home
