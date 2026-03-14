import { Text } from 'react-native';
import useDyslexia from '../hooks/useDyslexia';

export function ThemedText(props) {
  const dyslexiaStyle = useDyslexia();
  return <Text {...props} style={[props.style, dyslexiaStyle]} />;
}
