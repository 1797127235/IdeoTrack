import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

export default function StudentHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>学生首页</Text>
      <Text style={styles.subtitle}>Story 1.1 登录成功占位页</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 8,
  },
});
