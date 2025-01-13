export function preventValueMoney(event: React.KeyboardEvent<HTMLInputElement>) {
    const value = event.key;
    const regex = /^[0-9.]*$/;
    const target = event.target as HTMLInputElement; // Type assertion
    if (
        value === "," &&
        (target.value.indexOf(",") > -1 || !target.value)
    ) {
        event.preventDefault();
    } else if (!regex.test(value) && value !== "Backspace") {
        event.preventDefault();
    }
}

