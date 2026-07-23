(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.categoryRules = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const baseCategories = ["Balolsavam", "Yuvajanotsavam", "Vanitholsavam"];

  function getCategoryState(ageValue, genderValue, currentValue = "") {
    const parsedAge = Number(ageValue);
    const isAgeBelowNine = Number.isFinite(parsedAge) && parsedAge < 9;
    const isAgeGreaterThanNine = Number.isFinite(parsedAge) && parsedAge > 9;

    if (isAgeBelowNine) {
      return {
        options: ["Balolsavam"],
        selectedValue: "Balolsavam",
        locked: true,
      };
    }

    // Age == 9 will fall through to the default Yuvajanotsavam behavior
    if (genderValue === "Female") {
      // For females older than 9, show both Yuvajanotsavam and Vanitholsavam
      if (isAgeGreaterThanNine) {
        return {
          options: ["Yuvajanotsavam", "Vanitholsavam"],
          selectedValue: currentValue && ["Yuvajanotsavam", "Vanitholsavam"].includes(currentValue) ? currentValue : "",
          locked: false,
        };
      }
      // For females age 9 (or unspecified), show Yuvajanotsavam
      return {
        options: ["Yuvajanotsavam"],
        selectedValue: currentValue && ["Yuvajanotsavam"].includes(currentValue) ? currentValue : "",
        locked: false,
      };
    }

    if (genderValue === "Male") {
      return {
        options: ["Yuvajanotsavam"],
        selectedValue: "Yuvajanotsavam",
        locked: true,
      };
    }

    return {
      options: baseCategories,
      selectedValue: currentValue && baseCategories.includes(currentValue) ? currentValue : "",
      locked: false,
    };
  }

  return {
    getCategoryState,
    baseCategories,
  };
});
