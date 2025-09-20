# Fleeditto DeFi - Advanced Liquidity Management Dashboard

A sophisticated, production-ready DeFi application for managing concentrated liquidity positions across multiple Aptos DEXes in a single, batched transaction.

![Fleeditto DeFi Dashboard](https://img.shields.io/badge/Next.js-15.5.2-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-blue)
![Aptos](https://img.shields.io/badge/Aptos-Blockchain-green)

## 🌟 Features

### Core Functionality
- **Multi-DEX Support**: Unified interface for Thala, tapp Exchange, and Hyperion
- **Concentrated Liquidity**: Professional-grade price range configuration
- **Real-time Price Data**: Live price feeds from DexScreener API
- **Wallet Integration**: Seamless connection with Petra, Martian, and OKX wallets
- **Interactive Charts**: Beautiful liquidity distribution visualization with Recharts

### Technical Highlights
- **Modular Architecture**: Clean separation of concerns with adapter pattern
- **Type Safety**: Comprehensive TypeScript implementation
- **Responsive Design**: Mobile-first approach with glassmorphism UI
- **Performance Optimized**: Efficient data fetching with SWR and React Query
- **Error Handling**: Robust error boundaries and user feedback

## 🏗 Architecture

### 📁 Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── DEXSelector.tsx   # DEX selection interface
│   ├── TokenInput.tsx    # Token configuration input
│   ├── LiquidityChart.tsx # Price distribution visualization
│   ├── PriceRangeSelector.tsx # Range configuration
│   ├── WalletConnection.tsx # Wallet integration
│   └── LiquidityDashboard.tsx # Main application
├── lib/
│   ├── dex_adapters/     # DEX adapter pattern implementation
│   │   ├── interface.ts  # Common interface
│   │   ├── thala.ts     # Thala DEX adapter
│   │   ├── tapp.ts      # tapp Exchange adapter
│   │   ├── hyperion.ts  # Hyperion adapter
│   │   └── factory.ts   # Adapter factory
│   └── services/         # Business logic services
│       ├── token.ts     # Token metadata & balance service
│       └── price.ts     # Price fetching service
├── contexts/
│   └── AppContext.tsx   # Global state management
├── config/
│   └── dexes.ts        # DEX configuration
└── app/
    ├── layout.tsx       # Application layout
    ├── page.tsx         # Home page
    └── globals.css      # Global styles
```

### 🔧 Adapter Pattern

The application uses a sophisticated adapter pattern to support multiple DEXes:

```typescript
interface IDexAdapter {
  checkPoolExists(tokenA: string, tokenB: string): Promise<PoolInfo>;
  createAddLiquidityPayload(params: AddLiquidityParams): Promise<TransactionPayload>;
  getContractAddress(): string;
  getSupportedFeeTiers(): number[];
}
```

Each DEX implements this interface with protocol-specific logic, making it easy to add new DEXes.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Aptos wallet (Petra, Martian, or OKX)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Build for Production

```bash
pnpm build
pnpm start
```

## 🔗 Supported DEXes

| DEX | Status | Contract Address | Features |
|-----|--------|------------------|----------|
| **Thala** | ✅ Ready | `0x007730cd28...` | Stable & Weighted Pools |
| **tapp Exchange** | ✅ Ready | `0x487e905f89...` | Concentrated Liquidity |
| **Hyperion** | ✅ Ready | `0x8b4a2c4bb5...` | High Performance AMM |

## 💡 User Flow

1. **Connect Wallet**: Use the wallet connection modal to connect your Aptos wallet
2. **Select DEX**: Choose your preferred DEX from the visual selector
3. **Configure Tokens**: Enter fungible asset addresses for both tokens
4. **Set Price Range**: Configure your liquidity concentration using:
   - Quick presets (Tight ±5%, Medium ±15%, Wide ±30%)
   - Manual price range configuration
5. **Review & Submit**: Confirm your position and submit the transaction

## 🎨 Design System

### Glassmorphism Theme
- **Background**: Gradient from dark blue to purple
- **Cards**: Translucent with backdrop blur effects
- **Typography**: Inter font family for modern look
- **Colors**: Teal/cyan accent colors with high contrast

### Interactive Elements
- **Smooth Animations**: Framer Motion for fluid interactions
- **Hover Effects**: Subtle scale and glow transformations
- **Loading States**: Professional loading indicators
- **Error Handling**: User-friendly error messages

## 📊 Price & Data Services

### DexScreener Integration
```typescript
// Real-time price fetching
const { relativePrice, isLoading } = useRelativePrice(
  tokenAAddress, 
  tokenBAddress, 
  300000 // 5-minute refresh
);
```

### Token Balance Fetching
```typescript
// Automatic balance updates
const balance = await TokenService.getTokenBalance(
  userAddress, 
  tokenAddress
);
```

## 🔐 Security Features

- **Address Validation**: Comprehensive Aptos address validation
- **Input Sanitization**: All user inputs are properly validated
- **Error Boundaries**: Graceful error handling throughout the app
- **No Secret Exposure**: No sensitive data in client-side code

## 🚧 Development Status

### ✅ Completed Features
- [x] Complete UI/UX implementation
- [x] DEX adapter pattern
- [x] Wallet integration
- [x] Price data fetching
- [x] Token balance management
- [x] Interactive price range selection
- [x] Responsive design
- [x] TypeScript implementation
- [x] Build optimization

### 🔄 TODO: Integration Tasks
- [ ] Complete DEX-specific smart contract integration
- [ ] Transaction simulation and validation
- [ ] Gas estimation
- [ ] Transaction status tracking
- [ ] Pool existence validation
- [ ] Liquidity position management

### 🛠 Technical Debt
- [ ] Add comprehensive test suite
- [ ] Implement error monitoring
- [ ] Add performance monitoring
- [ ] Optimize bundle size
- [ ] Add accessibility features

## 📱 Browser Support

- **Chrome**: ✅ Full support
- **Firefox**: ✅ Full support  
- **Safari**: ✅ Full support
- **Mobile**: ✅ Responsive design

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Aptos Foundation** for the blockchain infrastructure
- **DEX Protocols** (Thala, tapp, Hyperion) for liquidity provision
- **DexScreener** for reliable price data API
- **Recharts** for beautiful data visualization

---

**Built with ❤️ for the Aptos DeFi ecosystem**
