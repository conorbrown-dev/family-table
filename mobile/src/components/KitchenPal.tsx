import {View} from 'react-native';
import Svg,{Path,Ellipse,Circle,G} from 'react-native-svg';
export default function KitchenPal({small=false}:{small?:boolean}){return <View accessible accessibilityLabel="A smiling strawberry with a pink bow beneath a pastel rainbow" style={{alignItems:'center',justifyContent:'center',width:small?138:180,height:small?108:155}}><Svg width={small?138:180} height={small?108:155} viewBox="0 0 180 155">
 <Path d="M20 78 A70 70 0 0 1 160 78" fill="none" stroke="#edacd2" strokeWidth="10"/><Path d="M31 78 A59 59 0 0 1 149 78" fill="none" stroke="#f8dc9b" strokeWidth="10"/><Path d="M42 78 A48 48 0 0 1 138 78" fill="none" stroke="#b8dbb0" strokeWidth="10"/><Path d="M53 78 A37 37 0 0 1 127 78" fill="none" stroke="#d5b5ed" strokeWidth="10"/>
 <G fill="#fffafc" stroke="#e6c9e0" strokeWidth="1.5"><Path d="M8 83 Q2 70 14 66 Q15 54 29 58 Q40 53 44 66 Q59 68 54 82 Z"/><Path d="M128 83 Q123 69 136 66 Q138 54 151 58 Q163 54 166 68 Q179 70 173 83 Z"/></G>
 <Ellipse cx="90" cy="145" rx="38" ry="5" fill="#efd2e5"/>
 <Path d="M90 70 C41 49 42 97 63 120 Q80 140 90 141 Q103 138 118 120 C143 92 134 53 90 70" fill="#f49ab8" stroke="#b85c87" strokeWidth="2.5"/>
 <Path d="M90 74 L71 66 L81 62 L72 54 L88 58 L93 46 L99 59 L112 52 L107 64 L121 66 L100 75 Z" fill="#b9dea7" stroke="#779e74" strokeWidth="2" strokeLinejoin="round"/>
 <G fill="#fff3c6"><Ellipse cx="64" cy="84" rx="2" ry="3"/><Ellipse cx="80" cy="83" rx="2" ry="3"/><Ellipse cx="113" cy="86" rx="2" ry="3"/><Ellipse cx="64" cy="110" rx="2" ry="3"/><Ellipse cx="115" cy="109" rx="2" ry="3"/><Ellipse cx="81" cy="127" rx="2" ry="3"/><Ellipse cx="101" cy="128" rx="2" ry="3"/></G>
 <Circle cx="77" cy="100" r="3" fill="#694063"/><Circle cx="103" cy="100" r="3" fill="#694063"/><Ellipse cx="68" cy="107" rx="6" ry="3.5" fill="#ee709d"/><Ellipse cx="112" cy="107" rx="6" ry="3.5" fill="#ee709d"/><Path d="M84 107 Q90 116 97 107" stroke="#694063" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
 <Path d="M110 69 Q93 48 91 67 Q92 80 110 73 Q125 87 129 73 Q133 57 110 69" fill="#efd7ff" stroke="#ad7ac0" strokeWidth="2"/><Circle cx="110" cy="71" r="4" fill="#cf9fe3"/>
 <G fill="#c398dc"><Path d="M17 109 L20 100 L23 109 L32 112 L23 115 L20 124 L17 115 L8 112 Z"/><Path d="M157 119 L159 113 L161 119 L167 121 L161 123 L159 129 L157 123 L151 121 Z"/></G>
 </Svg></View>}
