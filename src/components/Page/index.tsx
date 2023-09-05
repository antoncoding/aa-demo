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
        <meta name="description" content="Account Abstraction on L2" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300&family=Victor+Mono:wght@200&display=swap" rel="stylesheet"/>
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
