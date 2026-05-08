# Password Vault 🛡️

A premium, local-first password and account management application built with **Tauri**, **React**, and **Rust**. Designed for speed, security, and a seamless user experience.

## Overview

Password Vault is a state-of-the-art desktop application that allows you to securely store and manage your digital identity. Unlike cloud-based solutions, Password Vault prioritizes your privacy by keeping all sensitive data on your local machine, protected by a master password and the safety of the Rust ecosystem.

## Key Features

- **Double-Layered Security**: Separate management for sensitive **Secrets** (passwords, tokens) and metadata **Values** (emails, usernames, custom fields).
- **Granular History Tracking**: Every change is tracked. View the "Change History" for any secret or value to see exactly when and what was modified.
- **Intelligent Password Generator**: Create cryptographically strong passwords with customizable length and character sets.
- **Premium Aesthetics**: A meticulously designed interface featuring:
  - **Dynamic Dark Mode**: Fluid switching between light and dark themes.
  - **Glassmorphism & Micro-animations**: A modern feel that responds to every interaction.
  - **Optimized Layouts**: Smooth search, filtering, and pagination for large vaults.
- **Secure Interactions**: Masked values by default, "one-click" reveal, and automatic clipboard clearing.
- **Import/Export**: Seamlessly migrate your data with robust import validation and duplicate detection.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Modern Vanilla CSS with a custom-built design system
- **Backend**: Rust, Tauri
- **Database**: Local encrypted storage
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS)
- [Rust](https://www.rust-lang.org/tools/install)
- [pnpm](https://pnpm.io/installation) (recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/EAOErmak/password-vault.git
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run in development mode:
   ```bash
   pnpm tauri dev
   ```

4. Build for production:
   ```bash
   pnpm tauri build
   ```

## Design Philosophy

The application follows a **"Privacy-by-Design"** philosophy. Every UI element is crafted to prevent shoulder surfing while maintaining high productivity. The use of custom-styled components instead of generic libraries ensures a lightweight, consistent, and premium feel throughout the app.

---

*Created with ❤️ for security and privacy.*
