import { findByProps } from "@vendetta/metro";

// The input component is a named `InputView` export on current Discord, not the module's
// default -- destructuring `default` left it undefined and the settings page rendered
// nothing. Keep the old path as a fallback, and never destructure a finder result.
const InputModule = findByProps("ClearButtonVisibility");

const ClearButtonVisibility = InputModule?.ClearButtonVisibility;
const InputView = InputModule?.InputView ?? InputModule?.default;

export function CustomTimeInputRow({ value, onChangeText, placeholder, disabled }) {
    if (!InputView) return null;

    return <InputView
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        clearButtonVisibility={ClearButtonVisibility?.WITH_CONTENT}
        showBorder={false}
        showTopContainer={false}
        disabled={disabled}
        style={{ paddingHorizontal: 15, paddingVertical: 13 }}
    />
}
