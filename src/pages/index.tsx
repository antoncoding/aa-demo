import { Button } from '@chakra-ui/react'
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import {useSmartWallet} from "../hooks/useSmartWallet"

const Home: NextPage = () => {

  const { sendERC20 } = useSmartWallet()

  const handleClick = async () => {
    console.log("click")
    await sendERC20('5000000')
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>AA For Lyra</title>
        <meta name="description" content="ETH + Next.js DApp Boilerplate by ilyxium" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h2 className={styles.title}>
          Welcome
        </h2>

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
              onClick={() => handleClick()}
            >
              <p>Send ETH Tx</p>
            </Button>
        </div>
      </main>
    </div>
  )
}

export default Home
