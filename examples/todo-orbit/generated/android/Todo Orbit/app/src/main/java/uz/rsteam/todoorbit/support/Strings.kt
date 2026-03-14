package uz.rsteam.todoorbit

fun UiLocale.toLanguageTag(): String {
    return when (this) {
        UiLocale.En -> "en"
        UiLocale.Ru -> "ru"
    }
}
