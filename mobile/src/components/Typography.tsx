import React from 'react';
import {Text as NativeText,TextProps,StyleSheet} from 'react-native';
export const headingFont='BubblegumSans_400Regular';
export function Text({style,...props}:TextProps & {className?:string}){
 const weight=Number(StyleSheet.flatten(style)?.fontWeight??400);
 const fontFamily=weight>=700?'Nunito_800ExtraBold':weight>=500?'Nunito_600SemiBold':'Nunito_400Regular';
 return <NativeText {...props} style={[{fontFamily},style,{fontWeight:'normal'}]}/>;
}
