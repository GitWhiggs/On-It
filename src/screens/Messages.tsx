import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '@/components/BottomNav';

const C = {
  bg: '#FAFAF7',         // Your app's signature background
  surface: '#FFFFFF',
  border: '#DAD8D1',
  text: '#111111',
  textSecondary: '#5E5E5A',
  textMuted: '#9A9A94',
  accent: '#FF5A1F',     // Your app's signature orange accent
};

const CHATS = [
  {
    id: '1',
    name: 'Marcus V.',
    gig: 'Moving · $45', // Marketplace context built right into the row
    lastMessage: 'On my way to Storrs now, see you in 10 minutes!',
    time: '2m ago',
    unread: true,
    initials: 'M',
  },
  {
    id: '2',
    name: 'OnIt Support',
    gig: 'Official',
    lastMessage: 'Welcome to OnIt! Let us know if you need any help.',
    time: 'Yesterday',
    unread: false,
    initials: 'O',
  },
];

export default function Messages() {
  const router = useRouter();
  const [chats] = useState(CHATS);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Messages</Text>

        {chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="chat-outline" size={48} color={C.textMuted} />
            <Text style={styles.sub}>Chats with your helper will show up here.</Text>
          </View>
        ) : (
          <View style={styles.chatList}>
            {chats.map((chat) => (
              <Pressable 
                key={chat.id} 
                style={styles.chatRowContainer}
                onPress={() => router.push({
                  pathname: '/chat/[id]',
                  params: { id: chat.id, name: chat.name }
                })}
              >
                <View style={styles.chatRow}>
                  {/* Clean avatar with your accent color for unread states */}
                  <View style={[styles.avatar, chat.unread && styles.avatarUnread]}>
                    <Text style={[styles.avatarText, chat.unread && styles.avatarTextUnread]}>
                      {chat.initials}
                    </Text>
                  </View>

                  <View style={styles.chatInfo}>
                    <View style={styles.rowTop}>
                      <View style={styles.nameRow}>
                        <Text style={styles.chatName}>{chat.name}</Text>
                        <Text style={styles.gigTag}>{chat.gig}</Text>
                      </View>
                      <Text style={[styles.chatTime, chat.unread && styles.unreadTime]}>
                        {chat.time}
                      </Text>
                    </View>

                    <Text 
                      style={[styles.lastMessage, chat.unread && styles.unreadMessage]} 
                      numberOfLines={2}
                    >
                      {chat.lastMessage}
                    </Text>
                  </View>

                  {chat.unread && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.separator} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav index={2} onChange={() => {}} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 130, gap: 16 },

  title: { color: C.text, fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  sub: { color: C.textSecondary, fontSize: 16, textAlign: 'center' },

  chatList: { gap: 4 },
  
  chatRowContainer: {
    paddingVertical: 4,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E5E3DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUnread: {
    backgroundColor: C.text,
  },
  avatarText: { color: C.textSecondary, fontSize: 20, fontWeight: '700' },
  avatarTextUnread: { color: '#fff' },

  chatInfo: { flex: 1 },
  rowTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  chatName: { color: C.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  
  gigTag: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#EFECE6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },

  chatTime: { color: C.textMuted, fontSize: 13, fontWeight: '500' },
  unreadTime: { color: C.accent, fontWeight: '700' },
  
  lastMessage: { color: C.textSecondary, fontSize: 14, lineHeight: 18 },
  unreadMessage: { color: C.text, fontWeight: '600' },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginLeft: 66, // Keeps the clean indented line past the avatar just like iOS
  },
});