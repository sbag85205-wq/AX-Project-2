import type {Metadata} from "next";
export const metadata:Metadata={title:"냥대리. 함께 묻고, 함께 자라요.",description:"직원의 궁금증을 함께 해결하는 업무 메이트."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
