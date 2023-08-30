import type { NextPage } from 'next'

import { Heading, Flex, Text } from '@chakra-ui/layout'
import { Image } from '@chakra-ui/react'

const About: NextPage = () => {

  return (
    <Flex
      direction="row"
      width="100%"
      height="90%"
      alignItems="center"
      justifyContent="space-between"
      padding="2rem"
    >
      <Flex
        width="66%"
        height="100%"
        direction="column"
        justifyContent="space-between"
        gap="3rem"
      >
          <Heading>
              About Page
          </Heading>
      </Flex>
    </Flex>
  )
}

export default About
