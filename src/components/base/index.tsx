// src/components/base/index.tsx - COMPONENTES BASE CORREGIDOS
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Pressable
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  FadeIn,
  FadeOut,
  SlideInUp
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';

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
  icon: React.ReactNode;
  onPress?: () => void;
  variant?: 'filled' | 'outlined' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  disabled?: boolean;
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
            color={variant === 'filled' ? '#ffffff' : color} 
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
  icon,
  onPress,
  variant = 'filled',
  size = 'md',
  color = theme.colors.primary[500],
  disabled = false,
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

  const getIconButtonStyle = (): ViewStyle[] => {
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

    // States
    if (disabled) {
      baseStyle.push(styles.iconButtonDisabled);
    }

    return baseStyle;
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[getIconButtonStyle(), style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {icon}
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
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1);
    }
  };

  const cardStyle: ViewStyle[] = [
    styles.card,
    glassmorphism && styles.cardGlass,
    noPadding && styles.cardNoPadding,
    style
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={cardStyle}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.95}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

// ========================================
// INPUT COMPONENT
// ========================================
export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  rightIcon,
  style,
  inputStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

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
// CUSTOM MODAL COMPONENT
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
      case 'sm': return '80%';
      case 'lg': return '95%';
      default: return '90%';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInUp}
              style={[
                styles.modalContainer,
                glassmorphism && styles.modalGlass,
                { maxWidth: getModalSize() }
              ]}
            >
              {title && (
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                    <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                  </TouchableOpacity>
                </View>
              )}
              
              <ScrollView style={styles.modalContent}>
                {children}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

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
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  buttonMd: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  buttonLg: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
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
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600' as const,
    fontFamily: theme.fonts.bold,
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: theme.spacing.xs,
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
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
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
    marginBottom: theme.spacing.sm,
  },
  inputLabel: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '500' as const,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    paddingHorizontal: theme.spacing.sm,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary[500],
  },
  inputContainerError: {
    borderColor: theme.colors.error[500],
  },
  input: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing.sm,
  },
  inputWithIcon: {
    marginLeft: theme.spacing.xs,
  },
  inputWithRightIcon: {
    marginRight: theme.spacing.xs,
  },
  inputIcon: {
    marginRight: theme.spacing.xs,
  },
  inputRightIcon: {
    marginLeft: theme.spacing.xs,
  },
  inputError: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.error[500],
    marginTop: theme.spacing.xs,
  },

  // Loading styles
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingBlur: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface.primary,
    borderRadius: theme.borderRadius.xl,
    maxHeight: '80%',
    width: '100%',
  },
  modalGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  modalTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
  },
  modalClose: {
    padding: theme.spacing.xs,
  },
  modalContent: {
    padding: theme.spacing.lg,
  },
});