import { FC } from 'react'
import { Flex } from '@chakra-ui/layout'
import { Header } from '../Header'
import Head from 'next/head'
// import { useWallet } from '../../context/wallet-provider'

export const Page: FC = ({ children }) => {
  return (
    <>
      <Head>
        <title>page title</title>
        <meta name="description" content="Ethereum + Next.js DApp Boilerplate" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Flex direction="column" backgroundColor="#1F1B24">
        <Header />
        <main>{children}</main>
        <Footer />
      </Flex>
    </>
  )
}

const Footer = () => {
  return <Flex height="10%"></Flex>
}
