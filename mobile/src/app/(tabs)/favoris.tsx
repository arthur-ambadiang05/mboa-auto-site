import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCatalog } from '../../lib/store';
import { Brand, Button, Notice, VehicleCard, colors } from '../../components/ui';
export default function Favorites(){const {vehicles,favorites}=useCatalog();return <SafeAreaView edges={['top','left','right']} style={{flex:1,backgroundColor:colors.bg}}><FlatList data={vehicles.filter(v=>favorites.includes(v.slug))} keyExtractor={v=>v.slug} renderItem={({item})=><VehicleCard vehicle={item}/>} contentContainerStyle={{padding:20,width:'100%',maxWidth:680,alignSelf:'center'}} ListHeaderComponent={<View><Brand/><Text style={{fontSize:30,fontWeight:'800',color:colors.ink,marginVertical:24}}>Mes favoris</Text><Text style={{color:colors.muted,marginBottom:20}}>Vos voitures préférées, gardées sur cet appareil.</Text><Notice/></View>} ListEmptyComponent={<View style={{paddingVertical:35,gap:20}}><Text style={{color:colors.muted,lineHeight:24}}>Appuyez sur le cœur d’une voiture pour la retrouver ici. Les annonces retirées du catalogue ne sont plus affichées.</Text><Button title="Explorer le catalogue" onPress={()=>router.replace('/')}/></View>}/></SafeAreaView>;}
