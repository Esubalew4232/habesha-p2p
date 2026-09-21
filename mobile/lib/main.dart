import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const HabeshaP2PApp());
}

class HabeshaP2PApp extends StatefulWidget {
  const HabeshaP2PApp({Key? key}) : super(key: key);

  @override
  State<HabeshaP2PApp> createState() => _HabeshaP2PAppState();
}

class _HabeshaP2PAppState extends State<HabeshaP2PApp> {
  Locale _currentLocale = const Locale('am'); // Default to Amharic or English

  void setLocale(Locale locale) {
    setState(() {
      _currentLocale = locale;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Habesha P2P',
      debugShowCheckedModeBanner: false,
      locale: _currentLocale,
      supportedLocales: const [
        Locale('en', ''),
        Locale('am', ''),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Noto Sans Ethiopic',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D9488), // Ethiopian Emerald Green Accent
          primary: const Color(0xFF0F766E),
          secondary: const Color(0xFFD97706), // Ethiopian Gold Warmth
          background: const Color(0xFF090D16),
          surface: const Color(0xFF131B2E),
        ),
        scaffoldBackgroundColor: const Color(0xFF090D16),
      ),
      home: const MobileRootNavigation(),
    );
  }
}

class MobileRootNavigation extends StatefulWidget {
  const MobileRootNavigation({Key? key}) : super(key: key);

  @override
  State<MobileRootNavigation> createState() => _MobileRootNavigationState();
}

class _MobileRootNavigationState extends State<MobileRootNavigation> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          Center(child: Text('DASHBOARD', style: TextStyle(color: Colors.white))),
          Center(child: Text('MARKETPLACE', style: TextStyle(color: Colors.white))),
          Center(child: Text('ACTIVE TRADES', style: TextStyle(color: Colors.white))),
          Center(child: Text('PROFILE & SECURITY', style: TextStyle(color: Colors.white))),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: const Color(0xFF131B2E),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.storefront_outlined), label: 'Market'),
          NavigationDestination(icon: Icon(Icons.swap_horiz), label: 'Trades'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }
}
