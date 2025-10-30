# 🎬 Theater

**Theater** is a modern, AI-powered React Native mobile application for discovering movies and TV shows. Built with cutting-edge technologies, it provides personalized recommendations, intelligent search, and comprehensive content management features.

---

## 📱 Overview

Theater combines the power of **TMDB (The Movie Database)** with **Google Gemini AI** to deliver a seamless entertainment discovery experience. The app features mood-based recommendations, watchlist management, regional content filtering, and an AI cinema assistant for personalized suggestions.

### ✨ Key Features

- **🤖 AI-Powered Recommendations**: Chat with an AI cinema assistant powered by Google Gemini for personalized movie/TV show suggestions
- **🎭 Mood-Based Discovery**: Get recommendations based on your current mood with intelligent questionnaires
- **📚 Smart Watchlists**: Create and manage multiple watchlists with AI-powered insights and pattern analysis
- **🔍 Advanced Search**: Search with filters including genres, ratings, release dates, languages, and streaming platforms
- **🌍 Regional Content**: Auto-detect region and filter content by language and availability
- **🎯 Personalized Home**: Customized feed based on your viewing history, preferences, and watchlist patterns
- **📊 Content Insights**: AI-generated trivia, critic ratings (IMDb, Rotten Tomatoes), and detailed analytics
- **🎨 Beautiful UI**: Modern glassmorphism design with blur effects and smooth animations
- **📴 Offline Support**: Cached content for offline browsing
- **🎬 Comprehensive Details**: Cast, crew, trailers, similar content, and streaming availability

---

## 🏗️ Architecture

### Tech Stack

- **Framework**: React Native 0.79.2 with TypeScript
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **State Management**: TanStack Query (React Query) for server state
- **Local Storage**: AsyncStorage for persistence
- **UI Components**: Custom components with React Native Reanimated
- **Styling**: StyleSheet with custom theme system
- **AI Integration**: Google Gemini API
- **Data Source**: TMDB API

### Core Dependencies

```json
{
  "react": "19.0.0",
  "react-native": "0.79.2",
  "@tanstack/react-query": "^5.76.1",
  "@react-navigation/native": "^7.1.9",
  "@react-navigation/bottom-tabs": "^7.3.13",
  "@react-navigation/native-stack": "^7.3.13",
  "axios": "^1.9.0",
  "react-native-reanimated": "^3.18.0",
  "react-native-linear-gradient": "^2.8.3",
  "react-native-fast-image": "^8.6.3"
}
```

---

## 📂 Project Structure

```
Theater/
├── src/
│   ├── assets/              # Images, fonts, and static resources
│   ├── components/          # Reusable UI components (62 files)
│   │   ├── AIFilterCreator.tsx
│   │   ├── AIReportFlag.tsx
│   │   ├── Cinema.tsx
│   │   ├── FeaturedBanner.tsx
│   │   ├── HorizontalList.tsx
│   │   ├── MovieCard.tsx
│   │   ├── MoodQuestionnaire.tsx
│   │   ├── MyNextWatch.tsx
│   │   └── ...
│   ├── hooks/               # Custom React hooks (19 files)
│   │   ├── useAIEnabled.ts
│   │   ├── useMovies.ts
│   │   ├── useTVShows.ts
│   │   ├── usePersonalization.ts
│   │   ├── useWatchlists.ts
│   │   └── ...
│   ├── navigation/          # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   ├── BottomTabNavigator.tsx
│   │   └── TabStacks.tsx
│   ├── screens/             # Main app screens (23 files)
│   │   ├── Home.tsx         # Home feed with AI recommendations
│   │   ├── Movies.tsx       # Browse movies by categories
│   │   ├── TVShows.tsx      # Browse TV shows by categories
│   │   ├── Search.tsx       # Explore - Search and discovery
│   │   ├── MyFilters.tsx    # Saved filters management
│   │   ├── OnlineAIScreen.tsx  # AI Cinema Assistant
│   │   ├── MovieDetails.tsx
│   │   ├── TVShowDetails.tsx
│   │   ├── MySpace.tsx      # Watchlists and preferences
│   │   ├── Watchlists.tsx
│   │   └── ...
│   ├── services/            # API and business logic (9 files)
│   │   ├── api.ts           # TMDB API configuration
│   │   ├── tmdb.ts          # TMDB service functions
│   │   ├── gemini.ts        # Google Gemini AI integration
│   │   ├── queryClient.ts   # React Query configuration
│   │   ├── offlineCache.ts  # Offline caching logic
│   │   ├── regionDetection.ts
│   │   └── connectivity.ts
│   ├── store/               # Local state management (8 files)
│   │   ├── watchlists.ts    # Watchlist management
│   │   ├── settings.ts      # User preferences
│   │   ├── aiSettings.ts    # AI configuration
│   │   ├── filters.ts       # Saved filters
│   │   ├── history.ts       # Viewing history
│   │   └── ...
│   ├── styles/              # Theme and styling
│   │   └── theme.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── movie.ts
│   │   ├── tvshow.ts
│   │   ├── navigation.ts
│   │   └── filters.ts
│   └── utils/               # Utility functions
│       ├── cache.ts
│       ├── language.json
│       ├── region.json
│       └── shareCode.ts
├── android/                 # Android native code
├── ios/                     # iOS native code
├── App.tsx                  # Root component
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 18
- **React Native CLI**: Follow the [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd Theater
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **iOS Setup** (macOS only):

   ```bash
   bundle install
   cd ios && bundle exec pod install && cd ..
   ```

4. **Configure API Keys**:
   - The app uses TMDB API (key included for development)
   - For Google Gemini AI features, users must provide their own API key via in-app settings

### Running the App

#### Start Metro Bundler:

```bash
npm start
```

#### Run on Android:

```bash
npm run android
```

#### Run on iOS:

```bash
npm run ios
```

---

## 🎯 Core Features Breakdown

### 1. **Home Screen**

- Personalized content feed based on user preferences
- AI-powered history-based recommendations
- AI-powered watchlist-based recommendations
- AI-powered mood-based recommendations ("My Next Watch")
- Trending movies and TV shows
- Regional top 10 content
- Quick access to saved filters
- Language and OTT platform-specific sections

### 2. **AI Cinema Assistant** (`OnlineAIScreen`)

- Chat interface powered by Google Gemini
- Context-aware movie/TV show recommendations
- Natural language queries (e.g., "Suggest a thriller for tonight")
- Visual content cards with direct navigation
- Conversation history with thread management
- Voice-to-text input support

### 3. **Browse Screens** (Movies & TV Shows)

- Browse by categories (Popular, Top Rated, Latest, Upcoming)
- Genre-based filtering
- Language-specific content sections
- OTT platform-specific content
- Horizontal scrolling content lists
- Quick navigation to details

### 4. **Explore Screen** (`Search.tsx`)

- Trending contents
- Viewing history tracking
- Quick access to watchlists
- Advanced filter builder with AI assistance
- Multi-criteria search (genre, rating, year, language, OTT)
- Real-time search results
- Filter saving and management
- Natural language search
- Voice-to-text search support

### 5. **MyFilters Screen**

- Save and manage custom search filters
- Quick access to favorite filter combinations
- Edit and delete saved filters
- Apply filters instantly
- Filter templates for common searches
- AI-assisted filter creation

### 6. **MySpace Screen**

- Create and manage multiple custom watchlists
- AI-powered watchlist insights and pattern analysis
- Watchlist sharing via QR codes
- Smart recommendations based on watchlist content
- User preferences and settings
- Region, language, and OTT platform configuration

### 7. **Movie & TV Show Details**

- Comprehensive information (plot, cast, crew, ratings)
- AI-generated trivia and insights
- Critic ratings (IMDb, Rotten Tomatoes)
- Streaming availability by region
- Similar content recommendations
- Trailer playback
- Add to watchlist functionality
- Share content with QR codes
- AI chat for content-specific questions

### 8. **AI Features**

- **Cinema Chat**: Conversational AI for recommendations
- **History-Based Recommendations**: AI analyzes viewing history for personalized suggestions
- **Watchlist Analysis**: Pattern detection and insights from your watchlists
- **AI Compare/Quick Decision**: Compare multiple movies/shows and get AI-powered recommendations
- **Trivia Generation**: Interesting facts about movies/shows
- **Critic Ratings**: Automated fetching of IMDb and RT scores
- **Smart Filters**: AI-assisted filter creation from natural language
- **Mood Recommendations**: Context-aware suggestions based on mood questionnaire

---

## 🔧 Configuration

### AI Settings

Users can configure AI features in the app:

- **Model Selection**: Choose from available Gemini models (auto-fetched from API)
- **API Key**: Provide personal Google Gemini API key
- **Temperature & Max Tokens**: Fine-tune AI responses

### User Preferences

- **Region**: Auto-detected or manually selected
- **Languages**: Multiple content language preferences
- **OTT Platforms**: Select preferred streaming services
- **Theme**: Normal or blur (glassmorphism) mode

---

## 🛠️ Key Services

### TMDB Service (`tmdb.ts`)

Comprehensive integration with The Movie Database API:

- Movie and TV show discovery
- Search functionality
- Genre and category browsing
- Streaming provider information
- Cast and crew details
- Regional content filtering

### Gemini AI Service (`gemini.ts`)

Google Gemini AI integration for:

- Cinema chat assistant
- Watchlist pattern analysis
- Trivia generation
- Critic ratings fetching
- Personalized recommendations
- Story-based similarity search

### Query Client (`queryClient.ts`)

TanStack Query configuration for:

- Efficient data caching
- Background refetching
- Optimistic updates
- Cache invalidation strategies

### Offline Cache (`offlineCache.ts`)

Persistent caching for offline support:

- Content preloading
- Offline browsing
- Cache management

---

## 📊 State Management

### Server State (TanStack Query)

- API data caching and synchronization
- Automatic background refetching
- Optimistic updates
- Query invalidation

### Local State (AsyncStorage)

- **Watchlists**: User-created watchlists and items
- **Settings**: User preferences and configuration
- **AI Settings**: AI model and API key
- **Filters**: Saved search filters
- **History**: Viewing history
- **Onboarding**: First-time user flow state

---

## 🎨 UI/UX Features

- **Glassmorphism Design**: Modern blur effects with `@react-native-community/blur`
- **Smooth Animations**: React Native Reanimated for fluid transitions
- **Responsive Layout**: Tablet and phone optimized
- **Fast Image Loading**: FastImage for optimized image rendering
- **Skeleton Screens**: Loading states for better UX
- **Gradient Accents**: Linear gradients for visual appeal
- **Bottom Tab Navigation**: Easy access to main sections
- **Modal Overlays**: Context-specific actions and information

---

## 🔐 Security Notes

⚠️ **Important**: The TMDB API key is currently hardcoded in `src/services/api.ts` for development purposes. For production:

- Move API keys to environment variables
- Use secure key management solutions
- Implement API key rotation

Users must provide their own Google Gemini API key via in-app settings for AI features.

---

## 🧪 Testing

```bash
npm test
```

---

## 📦 Building for Production

### Android:

```bash
cd android
./gradlew assembleRelease
```

### iOS:

```bash
cd ios
xcodebuild -workspace Theater.xcworkspace -scheme Theater -configuration Release
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 🙏 Acknowledgments

- **TMDB**: The Movie Database for comprehensive movie/TV data
- **Google Gemini**: AI-powered recommendations and insights
- **React Native Community**: Excellent libraries and tools

---

## 📞 Support

For issues, questions, or feature requests, please open an issue in the repository.

---

**Built with ❤️ using React Native**
