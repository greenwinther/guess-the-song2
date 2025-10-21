import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SocketProvider from "@/contexts/SocketProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Guess the Song 2",
	description: "Multiplayer music-guessing game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<SocketProvider>{children}</SocketProvider>
			</body>
		</html>
	);
}
