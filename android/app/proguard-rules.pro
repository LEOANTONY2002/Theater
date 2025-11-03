# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ===== Optimization Settings =====
# Enable aggressive optimizations
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# Optimize and remove unused code
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-allowaccessmodification
-repackageclasses ''

# ===== React Native Core =====
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep all native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep React Native bridge
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ===== Realm Database =====
# Keep all Realm classes
-keep class io.realm.** { *; }
-dontwarn io.realm.**

# Keep all Realm model classes (your schema classes)
-keep class com.theater.** extends io.realm.RealmObject { *; }
-keep class * extends io.realm.RealmObject { *; }

# Keep Realm annotations
-keep @io.realm.annotations.RealmClass class *
-keep @io.realm.annotations.RealmModule class *

# Keep Realm schema properties
-keepclassmembers class * extends io.realm.RealmObject {
    public static io.realm.ObjectSchema schema;
    public static java.lang.String[] fieldNames;
    *;
}

# Keep all fields in Realm objects
-keepclassmembers class * extends io.realm.RealmObject {
    <fields>;
}

# Keep Realm React Native bridge
-keep class io.realm.react.** { *; }

# Keep Realm internal classes
-keep class io.realm.internal.** { *; }
-keep class io.realm.log.** { *; }

# CRITICAL: Keep JavaScript-accessible Realm classes
# These are your schema classes that JS accesses
-keep class * extends io.realm.RealmObject {
    public <init>();
    public <init>(io.realm.RealmModel);
    public static io.realm.ObjectSchema schema;
}

# Keep Realm List and RealmResults
-keep class io.realm.RealmList { *; }
-keep class io.realm.RealmResults { *; }
-keep class io.realm.RealmQuery { *; }
-keep class io.realm.RealmConfiguration { *; }

# Strip Realm debug info to reduce size
-assumenosideeffects class io.realm.log.RealmLog {
    public static void trace(...);
    public static void debug(...);
    public static void info(...);
}

# ===== React Navigation =====
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# ===== Fast Image =====
-keep class com.dylanvann.fastimage.** { *; }

# ===== Vector Icons =====
-keep class com.oblador.vectoricons.** { *; }

# ===== Linear Gradient =====
-keep class com.BV.LinearGradient.** { *; }

# ===== QR Code =====
-keep class org.reactnative.** { *; }

# ===== Async Storage =====
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ===== Picker =====
-keep class com.reactnativecommunity.picker.** { *; }

# ===== Slider =====
-keep class com.reactnativecommunity.slider.** { *; }

# ===== DateTime Picker =====
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# ===== Blur =====
-keep class com.cmcewen.blurview.** { *; }

# ===== Markdown Display =====
-keep class com.iamacup.markdowndisplay.** { *; }

# ===== Glassmorphism =====
-keep class com.glassmorphism.** { *; }

# ===== General React Native =====
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ===== Hermes Engine =====
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ===== OkHttp & Networking =====
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ===== Fresco Image Library =====
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.drawee.** { *; }

# ===== Suppress Warnings =====
-dontwarn com.facebook.react.**
-dontwarn java.nio.file.**
-dontwarn org.codehaus.mojo.animal_sniffer.**
