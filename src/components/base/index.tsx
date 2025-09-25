// src/components/base/index.tsx
import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Modal,
  TextInput,
  TextInputProps,
  Platform,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';

import { theme } from '../../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ========================================
// INTERFACES
// ========================================
interface ButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: 'filled' | 'outlined' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

interface IconButtonProps {
  onPress?: () => void;
  variant?: 'filled' | 'outlined' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  style?: ViewStyle;
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  glassmorphism?: boolean;
  noPadding?: boolean;
}

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  glassmorphism?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
}

interface HeaderProps {
  title: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
}

// ========================================
// BUTTON COMPONENT
// ========================================
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'filled',
  size = 'md',
  color = theme.colors.primary[500],
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
  children
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.button];

    // Size
    switch (size) {
      case 'sm':
        baseStyle.push(styles.buttonSm);
        break;
      case 'lg':
        baseStyle.push(styles.buttonLg);
        break;
      default:
        baseStyle.push(styles.buttonMd);
    }

    // Variant
    switch (variant) {
      case 'outlined':
        baseStyle.push(styles.buttonOutlined);
        baseStyle.push({ borderColor: color } as ViewStyle);
        break;
      case 'ghost':
        baseStyle.push(styles.buttonGhost);
        break;
      default:
        baseStyle.push({ backgroundColor: color } as ViewStyle);
    }

    // States
    if (disabled) {
      baseStyle.push(styles.buttonDisabled);
    }

    if (fullWidth) {
      baseStyle.push(styles.buttonFullWidth);
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle: TextStyle[] = [styles.buttonText];

    switch (variant) {
      case 'outlined':
      case 'ghost':
        baseStyle.push({ color: color } as TextStyle);
        break;
      default:
        baseStyle.push({ color: '#ffffff' } as TextStyle);
    }

    if (disabled) {
      baseStyle.push(styles.buttonTextDisabled);
    }

    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'outlined' || variant === 'ghost' ? color : '#ffffff'} 
          />
        ) : (
          <>
            {icon && <View style={styles.buttonIcon}>{icon}</View>}
            {(title || children) && (
              <Text style={getTextStyle()}>
                {children || title}
              </Text>
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// ICON BUTTON COMPONENT
// ========================================
export const IconButton: React.FC<IconButtonProps> = ({
  onPress,
  variant = 'filled',
  size = 'md',
  color = theme.colors.primary[500],
  disabled = false,
  loading = false,
  icon,
  style
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.iconButton];

    // Size
    switch (size) {
      case 'sm':
        baseStyle.push(styles.iconButtonSm);
        break;
      case 'lg':
        baseStyle.push(styles.iconButtonLg);
        break;
      default:
        baseStyle.push(styles.iconButtonMd);
    }

    // Variant
    switch (variant) {
      case 'outlined':
        baseStyle.push(styles.iconButtonOutlined);
        baseStyle.push({ borderColor: color } as ViewStyle);
        break;
      case 'ghost':
        baseStyle.push(styles.iconButtonGhost);
        break;
      default:
        baseStyle.push({ backgroundColor: color } as ViewStyle);
    }

    if (disabled) {
      baseStyle.push(styles.iconButtonDisabled);
    }

    return baseStyle;
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'outlined' || variant === 'ghost' ? color : '#ffffff'} 
          />
        ) : (
          icon
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// CARD COMPONENT
// ========================================
export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  glassmorphism = false,
  noPadding = false
}) => {
  const cardStyle: ViewStyle[] = [
    styles.card,
    glassmorphism && styles.cardGlass,
    noPadding && styles.cardNoPadding,
    style
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

// ========================================
// INPUT COMPONENT - CORREGIDO CON forwardRef
// ========================================
export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  icon,
  rightIcon,
  style,
  inputStyle,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const containerStyle: ViewStyle[] = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
    style
  ].filter(Boolean) as ViewStyle[];

  const textInputStyle: TextStyle[] = [
    styles.input,
    icon && styles.inputWithIcon,
    rightIcon && styles.inputWithRightIcon,
    inputStyle
  ].filter(Boolean) as TextStyle[];

  return (
    <View style={styles.inputWrapper}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}

      <View style={containerStyle}>
        {icon && <View style={styles.inputIcon}>{icon}</View>}

        <TextInput
          ref={ref}
          style={textInputStyle}
          placeholderTextColor={theme.colors.text.tertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {rightIcon && <View style={styles.inputRightIcon}>{rightIcon}</View>}
      </View>

      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
});

Input.displayName = 'Input';

// ========================================
// MODAL COMPONENT
// ========================================
export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  title,
  children,
  glassmorphism = false,
  size = 'md'
}) => {
  const getModalSize = () => {
    switch (size) {
      case 'sm':
        return { width: screenWidth * 0.8, maxHeight: screenHeight * 0.6 };
      case 'lg':
        return { width: screenWidth * 0.95, maxHeight: screenHeight * 0.85 };
      default:
        return { width: screenWidth * 0.9, maxHeight: screenHeight * 0.75 };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {glassmorphism ? (
          <BlurView intensity={20} style={styles.modalBlur}>
            <View style={[styles.modalContent, getModalSize()]}>
              {title && (
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.modalBody}>{children}</View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.modalContent, getModalSize()]}>
            {title && (
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.modalBody}>{children}</View>
          </View>
        )}
      </View>
    </Modal>
  );
};

// ========================================
// LOADING COMPONENT
// ========================================
export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  color = theme.colors.primary[500],
  text,
  overlay = false
}) => {
  const content = (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text style={styles.loadingText}>{text}</Text>
      )}
    </View>
  );

  if (overlay) {
    return (
      <View style={styles.loadingOverlay}>
        <BlurView intensity={20} style={styles.loadingBlur}>
          {content}
        </BlurView>
      </View>
    );
  }

  return content;
};

// ========================================
// HEADER COMPONENT
// ========================================
export const Header: React.FC<HeaderProps> = ({ title, leftComponent, rightComponent, style }) => (
  <View style={[styles.header, style]}>
    <View style={styles.headerLeft}>
      {leftComponent}
    </View>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={styles.headerRight}>
      {rightComponent}
    </View>
  </View>
);

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  // Button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md
  },
  buttonSm: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
  },
  buttonMd: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
  },
  buttonLg: {
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[5],
  },
  buttonOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    fontFamily: theme.fonts.bold,
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: theme.spacing[2],
  },

  // IconButton styles
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.full,
  },
  iconButtonSm: {
    width: 36,
    height: 36,
  },
  iconButtonMd: {
    width: 44,
    height: 44,
  },
  iconButtonLg: {
    width: 52,
    height: 52,
  },
  iconButtonOutlined: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  iconButtonGhost: {
    backgroundColor: 'transparent',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },

  // Card styles
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.sm,
  },
  cardGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardNoPadding: {
    padding: 0,
  },

  // Input styles
  inputWrapper: {
    marginBottom: theme.spacing[2],
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[1],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    paddingHorizontal: theme.spacing[3],
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary[500],
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing[3],
  },
  inputWithIcon: {
    marginLeft: theme.spacing[2],
  },
  inputWithRightIcon: {
    marginRight: theme.spacing[2],
  },
  inputIcon: {
    marginRight: theme.spacing[2],
  },
  inputRightIcon: {
    marginLeft: theme.spacing[2],
  },
  inputError: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing[1],
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  modalCloseButton: {
    padding: theme.spacing[1],
  },
  modalCloseText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.tertiary,
  },
  modalBody: {
    padding: theme.spacing[4],
  },

  // Loading styles
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[5],
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[3],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBlur: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.background.primary,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 2,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
});