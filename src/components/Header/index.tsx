/* eslint-disable @next/next/no-img-element */

import { Box, Flex, HStack, Stack, Text } from '@chakra-ui/layout'
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  useDisclosure,
  Button,
} from '@chakra-ui/react'
import {
  MenuIcon,
  XIcon
} from '@heroicons/react/outline'
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NavDrawerItem, NavItem } from './NavItem'

export const Header = () => {

  const { isOpen, onOpen, onClose, onToggle } = useDisclosure()

  return (
    <header>
      <Stack direction={['column', 'column', 'row']} px={2} py={4}>
        <HStack
          justifyContent={['space-between']}
          w={'full'}
          px={{ base: 0, lg: '2rem' }}
        >
          <Box fontWeight="bold" fontSize={[20, 20, 20]}>
          </Box>

          <HStack>
            <HStack
              px={[4, 4, 0]}
              display={['none', 'none', 'none', 'flex']}
              gap={{ lg: '0.4rem', xl: '1.5rem' }}
              mr={4}
            >
            <NavItem key="id-0" href={'/'} text="Home">  </NavItem>
            <NavItem key="id-1" href={'/bridge'} text="Bridge">  </NavItem>
            </HStack>

            {/* Connect Wallet Button */}
            <ConnectButton />

            {/* Drawer Toggle Button */}
            <Button
              backgroundColor="transparent"
              display={['flex', 'flex', 'flex', 'none']}
              color="white"
              _hover={{
                backgroundColor: '#121212'
              }}
              borderRadius="100%"
              onClick={onOpen}
            >
              {isOpen ? (
                <XIcon className="w-5 h-5" />
              ) : (
                <MenuIcon className="w-5 h-5" />
              )}
            </Button>
          </HStack>
        </HStack>
      </Stack>

      {/* Mobile Navbar */}
      <Drawer
        placement={'top'}
        isFullHeight={true}
        onClose={onClose}
        isOpen={isOpen}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody background="#1F1B24" px={2}>
            {/* Top Wrapper */}
            <Box
              fontWeight="bold"
              display="flex"
              justifyContent="space-between"
              width="100%"
              paddingX="0.5rem"
              paddingTop="0.5rem"
              marginBottom="3rem"
              fontSize={[20, 20, 20]}
            >
            

              {/* Wallet and Close Button Wrapper */}
              <Flex gap="0.5rem">

                {/* Close Icon */}
                <Button
                  backgroundColor="transparent"
                  color="white"
                  paddingX={0}
                  _hover={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)'
                  }}
                  borderRadius="100%"
                  onClick={onToggle}
                >
                  <XIcon className="w-7 h-7" />
                </Button>
              </Flex>
            </Box>

            <NavDrawerItem onClick={onToggle} key={"id-"} href={"/"}>
              <Flex alignItems="center" gap={2}>
                <Text padding="0" fontSize={'2rem'}>
                  {'Home'}
                </Text>
              </Flex>
            </NavDrawerItem>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </header>
  )
}
