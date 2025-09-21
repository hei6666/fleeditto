<div align="center">

  
  <img src="./frontend/public/favicon-backup.svg" alt="Fleeditto Logo" width="200"/>

# Fleeditto

**The Capital-Efficient Fair Launchpad & Liquidity Engine on Aptos.**

  
  <p>
    <img alt="License" src="https://img.shields.io/badge/License-MIT-blue.svg"/>
    <img alt="Aptos" src="https://img.shields.io/badge/Aptos-Move-orange"/>
    <img alt="Hackathon" src="https://img.shields.io/badge/CTRL+MOVE%20Hackathon-DeFi%20Track-brightgreen"/>
  </p>
</div>

---

## 📖 Table of Contents

- [🤔 The Problem](#-the-problem)
- [💡 The Solution: Fleeditto](#-the-solution-fleeditto)
- [✨ Core Concepts & Innovations](#-core-concepts--innovations)
- [🚀 Why Aptos?](#-why-aptos)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏁 Getting Started](#-getting-started)
- [🗺️ Roadmap: The Path to Decentralization](#️-roadmap-the-path-to-decentralization)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🤔 The Problem

For new projects in the Web3 space, one of the biggest hurdles is **liquidity bootstrapping**. To launch a token, projects need to provide substantial capital to create deep liquidity pools on decentralized exchanges (DEXs). This often requires millions of dollars, creating a high barrier to entry for innovative but less-funded teams and leading to fragmented, inefficient markets.

## 💡 The Solution: Fleeditto

Fleeditto is a revolutionary protocol that redefines how new projects are launched and how liquidity is created on the Aptos network. We solve the capital efficiency problem by creating a **shared liquidity engine**, powered by our core asset, **DITTO (Shared Utility Value) token**.

Instead of projects launching isolated liquidity pools, they join the Fleeditto ecosystem. They contribute their liquidity to a central `DITTO/APT` pool and, in return, a deep, dedicated pool for their own token (`PROJECT/DITTO`) is created. This creates a **Liquidity Alliance** where all participating projects form an interconnected, capital-efficient, and mutually beneficial network.

## ✨ Core Concepts & Innovations

Fleeditto is built on a set of powerful, interconnected economic principles:

*   **⚡ Capital Efficiency:** Projects can achieve deep liquidity with a fraction of the capital typically required. The shared `DITTO/APT` pool acts as a leverage point for the entire ecosystem.

*   **🚀 True Fair Launch:** New project tokens are launched with **zero external circulating supply**. 100% of the initial tokens are locked in the `PROJECT/DITTO` liquidity pool, ensuring a fair, transparent, and bot-resistant price discovery process for everyone.

*   **🔄 The Growth Flywheel:** The ecosystem is designed as a positive feedback loop.
    1.  A project's success drives buy pressure for DITTO.
    2.  The rising value of DITTO benefits **all other projects** in the alliance.
    3.  This shared success attracts more high-quality projects to join.
    4.  The flywheel spins faster.

*   **🔥 The Deflationary Engine:** Our unique **Burn-to-Mint** mechanism allows users to burn DITTO to mint project tokens directly from the protocol. This creates a powerful, permanent deflationary pressure on DITTO, ensuring that the ecosystem's value growth is captured by the core asset.

*   **🤝 Incentive Alignment:** By creating a "community of fate," all participating projects are incentivized to vet new members and support each other, fostering a healthier, more collaborative DeFi environment.

## 🚀 Why Aptos?

Fleeditto's ambitious design is only made possible by the unique architecture of the Aptos network.

*   **Parallel Execution:** The ability to process transactions in parallel is critical. It allows simultaneous trading across multiple project pools (`A/DITTO`, `B/DITTO`, `C/DITTO`) without conflict, enabling massive scalability and a seamless user experience.

*   **Move Language:** The resource-oriented nature of Move provides unparalleled security for a protocol that manages a complex web of assets and liquidity pools. It prevents common exploits like re-entrancy and ensures asset ownership is explicit and safe.

*   **Atomicity:** The entire process of onboarding a new project—receiving funds, minting DITTO, creating a new pool, and funding the main pool—is executed as a single, **atomic transaction**. If any step fails, the entire operation reverts, guaranteeing the safety of all funds.

*   **Low Fees & High Speed:** Provides the fast, affordable user experience necessary for our vision of a global, interconnected trading ecosystem.

## 🛠️ Tech Stack

*   **Smart Contracts:** **Move** on Aptos
*   **Frontend:** TypeScript, React / Next.js
*   **Wallet Integration:** Petra, and other Aptos-compatible wallets.

## 🏁 Getting Started

This section is for developers who want to set up the project locally.

**Prerequisites:**
*   [Aptos CLI](https://aptos.dev/cli-tools/aptos-cli/install-aptos-cli)
*   Node.js and npm/yarn

**Installation & Setup:**

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/fleeditto.git
    cd fleeditto
    ```

2.  **Install frontend dependencies:**
    ```bash
    cd frontend
    npm install
    ```

3.  **Compile and Test Move Contracts:**
    ```bash
    cd ../move
    aptos move compile
    aptos move test
    ```

4.  **Run the local development server:**
    ```bash
    cd ../frontend
    npm run dev
    ```

## 🗺️ Roadmap: The Path to Decentralization

We believe in progressive decentralization to ensure the long-term health and security of the protocol.

*   **Phase 1: Admin-Controlled Secure Launch (Current - Hackathon MVP)**
    *   The core team controls the function to add new projects. This allows for 100% security against price manipulation during onboarding and enables careful curation of initial projects to build a trusted foundation.

*   **Phase 2: Multi-sig & Community Governance**
    *   Transition control to a multi-signature wallet governed by trusted community members and ecosystem partners. Decisions will be made through a formal proposal and voting process.

*   **Phase 3: Fully Permissionless & Automated**
    *   The ultimate vision. The admin role will be removed entirely, and the protocol will run autonomously. New projects will be onboarded via a fully automated system based on a secure, on-chain **Time-Weighted Average Price (TWAP)** oracle for DITTO, ensuring a truly decentralized and unstoppable liquidity engine.

## 🤝 Contributing

We are building the future of DeFi on Aptos, and we welcome all contributors! If you're interested in helping, please:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Submit a Pull Request with a clear description of your changes.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.