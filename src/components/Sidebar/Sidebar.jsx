import { VStack, IconButton, Tooltip, Box, Text, Flex, useColorModeValue, Icon, Image, useMediaQuery, Collapse } from "@chakra-ui/react";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { menuItemsByRole, extraMenuItems } from "./SidebarMenuItem";
import { logout } from "../../Redux/authSlice";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";

const Sidebar = ({ isExpanded, setExpanded }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { role } = useSelector((state) => state.auth);
  const menuItems = menuItemsByRole[role] || [];
  const [isMobile] = useMediaQuery("(max-width: 768px)");
  const [openDropdown, setOpenDropdown] = useState(null); // Track which dropdown is open

  const bgColor = useColorModeValue("#F6F6FC", "base.bgdark");
  const hoverBg = useColorModeValue("rgba(123, 67, 241, 0.1)", "secondary.800");
  const activeBg = useColorModeValue("rgba(123, 67, 241, 0.3)", "brand.activeBg");
  const textColor = useColorModeValue("black", "white");
  const iconColor = useColorModeValue("gray.600", "gray.300");
  const activeIconColor = useColorModeValue("#7B43F1", "base.primary1");
  const activeTextColor = useColorModeValue("#7B43F1", "base.primary1");
  const scrolbarColor = useColorModeValue("#F6F6FC", "base.bgboxdark");

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const toggleDropdown = (label) => {
    setOpenDropdown(openDropdown === label ? null : label);
  };

  return (
    <Flex
      direction="column"
      bg={bgColor}
      color={textColor}
      height="100vh"
      width={isExpanded ? "200px" : "80px"}
      transition="width 0.3s ease-in-out"
      position="fixed"
      left={0}
      top={0}
      bottom={0}
      p={4}
      boxShadow="sm"
      justifyContent="space-between"
      onMouseEnter={() => !isMobile && setExpanded(true)}
      onMouseLeave={() => !isMobile && setExpanded(false)}
      display={isMobile && !isExpanded ? "none" : "flex"}
    >
      <Box display="flex" flexDirection="column" alignItems="center" mb={6}>
        <Image
          src="/hrumbles_logo2.png"
          alt="Logo"
          width={isExpanded ? "140px" : "60px"}
          height="auto"
          transition="width 0.3s ease"
          mb={isExpanded ? 3 : 2}
        />
      </Box>
      <VStack
        spacing={2}
        overflowY="auto"
        flex="1"
        borderRadius="12px"
        transition="border-radius 0.3s ease"
        boxShadow="lg"
        bg={scrolbarColor}
        css={{
          "&::-webkit-scrollbar": { width: "6px", display: "none" },
          "&::-webkit-scrollbar-thumb": { background: "#888", borderRadius: "4px" },
          "scroll-behavior": "smooth",
        }}
      >
        {menuItems.map(({ icon, label, path, dropdown }) => {
          const isActive = location.pathname === path || (dropdown && dropdown.some((item) => location.pathname === item.path));
          const isDropdownOpen = openDropdown === label;

          return (
            <Box key={label} w="full">
              <Tooltip label={label} placement="right" isDisabled={isExpanded}>
                <Flex
                  align="center"
                  gap={1}
                  px={isExpanded ? 4 : 2}
                  py={1}
                  borderRadius="12px"
                  bg={isActive ? activeBg : "transparent"}
                  _hover={{ bg: hoverBg }}
                  transition="background 0.3s ease-in-out"
                  w="full"
                >
                  <IconButton
                    as={path !== "#" ? Link : "button"}
                    to={path !== "#" ? path : undefined}
                    icon={<Icon as={icon} color={isActive ? activeIconColor : iconColor} />}
                    aria-label={label}
                    variant="ghost"
                    size="md"
                    _hover={{ color: activeIconColor }}
                  />
                  {isExpanded && (
                    <Flex justify="space-between" align="center" w="full">
                      <Text
                        as={path !== "#" ? Link : "span"}
                        to={path !== "#" ? path : undefined}
                        fontWeight={isActive ? "bold" : "normal"}
                        color={isActive ? activeTextColor : textColor}
                        flex="1"
                      >
                        {label}
                      </Text>
                      {dropdown && (
                        <Icon
                          as={isDropdownOpen ? ChevronUpIcon : ChevronDownIcon}
                          color={isActive ? activeIconColor : iconColor}
                          cursor="pointer"
                          onClick={() => toggleDropdown(label)}
                        />
                      )}
                    </Flex>
                  )}
                </Flex>
              </Tooltip>
              {dropdown && isExpanded && (
                <Collapse in={isDropdownOpen} animateOpacity>
                  <VStack spacing={1} pl={6} align="start">
                    {dropdown.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <Tooltip key={subItem.label} label={subItem.label} placement="right" isDisabled={isExpanded}>
                          <Flex
                            as={Link}
                            to={subItem.path}
                            align="center"
                            gap={1}
                            px={4}
                            py={1}
                            borderRadius="8px"
                            bg={isSubActive ? activeBg : "transparent"}
                            _hover={{ bg: hoverBg }}
                            transition="background 0.3s ease-in-out"
                            w="full"
                          >
                            <Icon as={subItem.icon} color={isSubActive ? activeIconColor : iconColor} boxSize={4} />
                            <Text
                              fontSize="sm"
                              fontWeight={isSubActive ? "bold" : "normal"}
                              color={isSubActive ? activeTextColor : textColor}
                            >
                              {subItem.label}
                            </Text>
                          </Flex>
                        </Tooltip>
                      );
                    })}
                  </VStack>
                </Collapse>
              )}
            </Box>
          );
        })}
      </VStack>
      <VStack spacing={4} mt={4}>
        {extraMenuItems.map(({ icon, label, action }) => (
          <Tooltip key={label} label={label} placement="right" isDisabled={isExpanded}>
            <Flex
              align="center"
              gap={4}
              px={isExpanded ? 4 : 2}
              py={3}
              borderRadius="12px"
              _hover={{ bg: hoverBg }}
              transition="background 0.3s ease-in-out"
              w="full"
              cursor="pointer"
              onClick={action === "logout" ? handleLogout : undefined}
            >
              <IconButton
                icon={<Icon as={icon} color={iconColor} />}
                aria-label={label}
                variant="ghost"
                size="md"
                _hover={{ color: activeIconColor }}
              />
              {isExpanded && <Text fontWeight="normal" color={textColor}>{label}</Text>}
            </Flex>
          </Tooltip>
        ))}
      </VStack>
      {isExpanded && (
        <Text fontSize="xs" color="gray.400" textAlign="center" mt={4}>
          Version: {__APP_VERSION__}
        </Text>
      )}
    </Flex>
  );
};

export default Sidebar;