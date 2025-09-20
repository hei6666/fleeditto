import { motion } from 'framer-motion';

export function ChartSkeleton() {
  return (
    <div className="h-48 w-full bg-gray-800/30 rounded-lg p-4 animate-pulse">
      <div className="h-full flex flex-col justify-between">
        {/* Mock chart bars */}
        <div className="flex items-end justify-between h-full space-x-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="bg-gray-600/50 rounded-t"
              style={{
                height: `${Math.random() * 60 + 20}%`,
                width: `${100 / 20}%`
              }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ 
                delay: i * 0.05,
                duration: 0.6,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
        
        {/* Loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-400">
            <motion.div
              className="w-2 h-2 bg-teal-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
            <motion.div
              className="w-2 h-2 bg-teal-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
                delay: 0.2
              }}
            />
            <motion.div
              className="w-2 h-2 bg-teal-500 rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
                delay: 0.4
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PriceDisplaySkeleton() {
  return (
    <div className="bg-gray-800/20 rounded-lg p-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-600/50 rounded w-24"></div>
        <div className="h-6 bg-gray-600/50 rounded w-32"></div>
      </div>
      <div className="mt-2 h-3 bg-gray-600/30 rounded w-40"></div>
    </div>
  );
}

export function ErrorDisplay({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <motion.div
      className="h-48 w-full bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center p-6">
        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-400 font-medium mb-2">Failed to load price data</p>
        <p className="text-red-300/70 text-sm mb-4">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 active:scale-95"
          >
            Retry
          </button>
        )}
      </div>
    </motion.div>
  );
}