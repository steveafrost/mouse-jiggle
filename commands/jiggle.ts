export default [
  {
    name: "jiggle",
    title: "Jiggle Mouse",
    description: "Move the mouse cursor randomly to prevent sleep",
    mode: "silent",
    arguments: [
      {
        name: "intensity",
        placeholder: "Intensity (5-20, default 10)",
        type: "text",
        required: false,
      },
    ],
  },
];
