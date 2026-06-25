import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {
  analyzePasswordStrength,
  generateMD5,
  generateSHA256,
  encodeBase64,
  decodeBase64,
  detectPhishing,
  getIPGeolocation,
  getNetworkInfo,
} from '../utils/hackingTools';
import {BannerAdComponent} from '../components/BannerAdComponent';

export function ToolsScreen() {
  const navigation = useNavigation();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const tools = [
    {id: 'password', name: 'Password Analyzer', icon: 'Lock'},
    {id: 'md5', name: 'MD5 Hash', icon: 'Hash'},
    {id: 'sha256', name: 'SHA256 Hash', icon: 'Lock'},
    {id: 'base64', name: 'Base64 Encode/Decode', icon: 'File'},
    {id: 'phishing', name: 'Phishing Detector', icon: 'Alert'},
    {id: 'ipgeo', name: 'IP Geolocation', icon: 'Globe'},
    {id: 'network', name: 'Network Info', icon: 'Wifi'},
  ];

  const handleToolAction = async () => {
    if (!input.trim() && activeTool !== 'ipgeo' && activeTool !== 'network') return;

    setLoading(true);
    try {
      switch (activeTool) {
        case 'password':
          setResult(analyzePasswordStrength(input));
          break;
        case 'md5':
          setResult({hash: generateMD5(input), type: 'MD5'});
          break;
        case 'sha256':
          setResult({hash: generateSHA256(input), type: 'SHA256'});
          break;
        case 'base64':
          setResult({
            encoded: encodeBase64(input),
            decoded: decodeBase64(input),
          });
          break;
        case 'phishing':
          setResult(detectPhishing(input));
          break;
        case 'ipgeo':
          setResult(await getIPGeolocation());
          break;
        case 'network':
          setResult(await getNetworkInfo());
          break;
      }
    } catch (error) {
      setResult({error: 'Operation failed'});
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (result.error) {
      return <Text style={styles.errorText}>{result.error}</Text>;
    }

    switch (activeTool) {
      case 'password':
        return (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Score: {result.score}/7</Text>
            <Text style={[styles.resultLabel, {color: result.score > 4 ? '#4ECDC4' : '#ff6b6b'}]}>
              {result.label}
            </Text>
            {result.feedback.map((f: string, i: number) => (
              <Text key={i} style={styles.resultItem}>- {f}</Text>
            ))}
          </View>
        );
      case 'md5':
      case 'sha256':
        return (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>{result.type} Hash:</Text>
            <Text style={styles.hashText} selectable>{result.hash}</Text>
          </View>
        );
      case 'base64':
        return (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Encoded:</Text>
            <Text style={styles.hashText} selectable>{result.encoded}</Text>
            <Text style={styles.resultTitle}>Decoded:</Text>
            <Text style={styles.hashText} selectable>{result.decoded}</Text>
          </View>
        );
      case 'phishing':
        return (
          <View style={styles.resultBox}>
            <Text style={[styles.resultTitle, {color: result.isSuspicious ? '#ff6b6b' : '#4ECDC4'}]}>
              {result.isSuspicious ? 'SUSPICIOUS' : 'SAFE'}
            </Text>
            <Text style={styles.resultLabel}>Risk Score: {result.riskScore}/100</Text>
            {result.reasons.map((r: string, i: number) => (
              <Text key={i} style={styles.resultItem}>- {r}</Text>
            ))}
          </View>
        );
      case 'ipgeo':
        return (
          <View style={styles.resultBox}>
            <Text style={styles.resultItem}>IP: {result.ip}</Text>
            <Text style={styles.resultItem}>City: {result.city}</Text>
            <Text style={styles.resultItem}>Region: {result.region}</Text>
            <Text style={styles.resultItem}>Country: {result.country}</Text>
            <Text style={styles.resultItem}>ISP: {result.org}</Text>
          </View>
        );
      case 'network':
        return (
          <View style={styles.resultBox}>
            <Text style={styles.resultItem}>Type: {result.type}</Text>
            <Text style={styles.resultItem}>Connected: {result.isConnected ? 'Yes' : 'No'}</Text>
            <Text style={styles.resultItem}>WiFi: {result.isWifi ? 'Yes' : 'No'}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ethical Hacking Tools</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.toolsList}>
        {tools.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.toolButton, activeTool === tool.id && styles.toolButtonActive]}
            onPress={() => {
              setActiveTool(activeTool === tool.id ? null : tool.id);
              setInput('');
              setResult(null);
            }}
          >
            <Text style={styles.toolName}>{tool.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeTool && (
        <View style={styles.inputSection}>
          {(activeTool !== 'ipgeo' && activeTool !== 'network') && (
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={
                activeTool === 'password' ? 'Enter password...' :
                activeTool === 'phishing' ? 'Enter URL...' :
                'Enter text...'
              }
              placeholderTextColor="#666"
              secureTextEntry={activeTool === 'password'}
              multiline={activeTool === 'base64'}
            />
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleToolAction}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                {activeTool === 'ipgeo' || activeTool === 'network' ? 'Get Info' : 'Analyze'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {renderResult()}

      <BannerAdComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  backButton: {
    color: '#4ECDC4',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  toolsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  toolButton: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  toolButtonActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#2d2d44',
  },
  toolName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  inputSection: {
    padding: 16,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2d2d44',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#4ECDC4',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultBox: {
    backgroundColor: '#1a1a2e',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  resultTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultLabel: {
    color: '#e0e0e0',
    fontSize: 14,
    marginBottom: 8,
  },
  resultItem: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 4,
  },
  hashText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    padding: 16,
  },
});
