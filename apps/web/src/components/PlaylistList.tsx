"use client";

import Image from "next/image";
import clsx from "clsx";
import { PlaylistItem } from "@/types/playlist";

type Props = {
	items: PlaylistItem[];
	currentIndex?: number | null;
	onSelect?: (item: PlaylistItem) => void;
	className?: string;
	showSubmitter?: boolean;
};

export default function PlaylistList({
	items,
	currentIndex = null,
	onSelect,
	className,
	showSubmitter = true,
}: Props) {
	return (
		<div className={clsx("rounded-2xl border p-4 space-y-3", className)}>
			<h2 className="text-lg font-medium">Playlist ({items.length}/20)</h2>

			{items.length === 0 ? (
				<p className="text-sm text-muted-foreground">No songs added yet.</p>
			) : (
				<ul className="grid gap-2">
					{items
						.slice()
						.sort((a, b) => a.position - b.position)
						.map((p) => {
							const isCurrent = typeof currentIndex === "number" && p.position === currentIndex;
							return (
								<li
									key={p.id}
									className={clsx(
										"rounded-xl border p-2 flex items-center gap-3 transition",
										isCurrent && "ring-2 ring-offset-2 ring-blue-500"
									)}
								>
									{p.thumbnailUrl ? (
										<img
											src={p.thumbnailUrl}
											alt=""
											width={160}
											height={120}
											className="h-12 w-16 object-cover rounded-lg"
										/>
									) : (
										<div className="h-12 w-16 rounded-lg bg-black/10 grid place-items-center text-xs">
											No img
										</div>
									)}

									<div
										className={clsx("flex-1 min-w-0", onSelect && "cursor-pointer")}
										onClick={onSelect ? () => onSelect(p) : undefined}
										title={p.title}
									>
										<p className="text-sm font-medium line-clamp-2">
											{p.position + 1}. {p.title}
										</p>
										{showSubmitter && (
											<p className="text-xs text-muted-foreground">{p.submitterName}</p>
										)}
									</div>

									{isCurrent && (
										<span className="text-xs px-2 py-1 rounded-full border bg-black/5">
											Playing
										</span>
									)}
								</li>
							);
						})}
				</ul>
			)}
		</div>
	);
}
