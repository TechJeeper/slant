module.exports = [
  {
    type: "heading",
    defaultValue: "Slant"
  },
  {
    type: "text",
    defaultValue: "Time cut through architectural louvers. Glow behind. Material in front."
  },
  {
    type: "section",
    items: [
      {
        type: "heading",
        defaultValue: "Presets"
      },
      {
        type: "select",
        messageKey: "Preset",
        label: "Look",
        defaultValue: "gallery",
        options: [
          { label: "Gallery Aluminum", value: "gallery" },
          { label: "Mid-century Oak", value: "oak" },
          { label: "Night Blackout", value: "night" },
          { label: "Paper White", value: "paper" },
          { label: "Custom", value: "custom" }
        ]
      }
    ]
  },
  {
    type: "section",
    items: [
      {
        type: "heading",
        defaultValue: "Custom material"
      },
      {
        type: "text",
        defaultValue: "Only used when Look is Custom."
      },
      {
        type: "color",
        messageKey: "CustomSlat",
        defaultValue: "0xAAAAAA",
        label: "Slat color"
      },
      {
        type: "color",
        messageKey: "CustomGlow",
        defaultValue: "0xFFFFFF",
        label: "Glow color"
      },
      {
        type: "color",
        messageKey: "CustomShadow",
        defaultValue: "0x555555",
        label: "Shadow color"
      }
    ]
  },
  {
    type: "section",
    items: [
      {
        type: "heading",
        defaultValue: "Form"
      },
      {
        type: "select",
        messageKey: "Density",
        label: "Slat density",
        defaultValue: "medium",
        options: [
          { label: "Fine", value: "fine" },
          { label: "Medium", value: "medium" },
          { label: "Bold", value: "bold" }
        ]
      },
      {
        type: "select",
        messageKey: "Layout",
        label: "Time layout",
        defaultValue: "stacked",
        options: [
          { label: "Stacked (HH over MM)", value: "stacked" },
          { label: "Side by side", value: "row" },
          { label: "Corner editorial", value: "corner" }
        ]
      },
      {
        type: "select",
        messageKey: "Accent",
        label: "Accent strip",
        defaultValue: "date",
        options: [
          { label: "Off", value: "off" },
          { label: "Date", value: "date" },
          { label: "Weekday", value: "weekday" },
          { label: "Battery", value: "battery" },
          { label: "Steps", value: "steps" }
        ]
      },
      {
        type: "select",
        messageKey: "GlowMode",
        label: "Glow",
        defaultValue: "fixed",
        options: [
          { label: "Fixed (from preset/custom)", value: "fixed" },
          { label: "Day cycle", value: "cycle" }
        ]
      },
      {
        type: "select",
        messageKey: "OpenAmount",
        label: "Resting open amount",
        defaultValue: "normal",
        options: [
          { label: "Tight", value: "tight" },
          { label: "Normal", value: "normal" },
          { label: "Airy", value: "airy" }
        ]
      }
    ]
  },
  {
    type: "section",
    items: [
      {
        type: "heading",
        defaultValue: "Behavior"
      },
      {
        type: "toggle",
        messageKey: "Use24Hour",
        label: "24-hour time",
        defaultValue: true
      },
      {
        type: "toggle",
        messageKey: "LeadingZero",
        label: "Leading zero",
        defaultValue: true
      },
      {
        type: "toggle",
        messageKey: "FlickOpen",
        label: "Flick opens louvers briefly",
        defaultValue: true
      }
    ]
  },
  {
    type: "submit",
    defaultValue: "Save"
  }
];
