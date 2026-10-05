import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../components/ui';
export default function Missing(){return <View style={{padding:30,gap:20}}><Text>Cette page n’existe pas.</Text><Button title="Catalogue" onPress={()=>router.replace('/')}/></View>;}
