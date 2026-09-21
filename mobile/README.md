# Habesha P2P — Native Mobile Application Codebase

This folder contains the complete production-grade Flutter/Dart mobile application for **Habesha P2P** (የኢትዮጵያ USDT P2P የሞባይል መተግበሪያ).

## Key Features & Architecture
- **State Management**: BLoC / Repository Pattern with clean architectural boundaries.
- **Authoritative Backend Security**: The mobile client has ZERO balance calculation authority. All balances, lock state, escrow timers, and releases are authoritative backend transactions.
- **Bilingual Localization**: 100% full English and Amharic (አማርኛ) support configured via `l10n` ARB files.
- **Supported Payment Methods**: CBE, Telebirr, Awash Bank, Dashen Bank, Bank of Abyssinia, CBE Birr, Hibret, Wegagen.
- **Strict Withdrawals**: Binance Pay ID and Bybit UID only.
- **Protected Escrow**: Real-time trade status monitoring, proof screenshot upload, dispute opening, and Telegram Bot integration (`@habeshap2pbbot`).

## Compilation & Run Instructions

### 1. Requirements
- Flutter SDK `>= 3.22.0`
- Android Studio / Xcode

### 2. Install Dependencies
```bash
cd mobile
flutter pub get
```

### 3. Generate Localization
```bash
flutter gen-l10n
```

### 4. Run Mobile App
```bash
# In debug mode connected to local backend:
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

### 5. Build Native Production Binaries
```bash
# Android APK:
flutter build apk --release

# Android App Bundle (Google Play):
flutter build appbundle --release

# iOS IPA:
flutter build ipa --release
```
