export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 min-h-[300px]">
      <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-amber font-mono-data text-sm animate-pulse tracking-widest uppercase">
        {text}
      </p>
    </div>
  )
}
