export const templates = [
  {
    id: 'template-1',
    name: 'Two Column',
    imageSrc: '/templates/template-1.svg',
    rows: 1,
    cols: 2,
    items: [
      { colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 2 },
      { colStart: 2, colEnd: 3, rowStart: 1, rowEnd: 2 }
    ]
  },
  {
    id: 'template-2',
    name: 'Top Single, Bottom Four',
    imageSrc: '/templates/template-2.svg',
    rows: 6,
    cols: 12,
    items: [
        {
          "colStart": 1,
          "colEnd": 5,
          "rowStart": 1,
          "rowEnd": 3
        },
        {
          "colStart": 1,
          "colEnd": 5,
          "rowStart": 5,
          "rowEnd": 7
        },
        {
          "colStart": 5,
          "colEnd": 9,
          "rowStart": 5,
          "rowEnd": 7
        },
        {
          "colStart": 9,
          "colEnd": 13,
          "rowStart": 5,
          "rowEnd": 7
        }
      ]
  },

  {
    id: 'template-3',
    name: 'Three Column',
    imageSrc: '/templates/template-3.svg',
    rows: 6,
    cols: 12,
    items: [
        {
          "colStart": 1,
          "colEnd": 5,
          "rowStart": 1,
          "rowEnd": 3
        },
        {
          "colStart": 5,
          "colEnd": 9,
          "rowStart": 1,
          "rowEnd": 3
        },
        {
          "colStart": 9,
          "colEnd": 13,
          "rowStart": 1,
          "rowEnd": 3
        },
        {
          "colStart": 9,
          "colEnd": 13,
          "rowStart": 3,
          "rowEnd": 5
        },
        {
          "colStart": 5,
          "colEnd": 9,
          "rowStart": 3,
          "rowEnd": 5
        },
        {
          "colStart": 1,
          "colEnd": 5,
          "rowStart": 3,
          "rowEnd": 5
        },
        {
          "colStart": 1,
          "colEnd": 5,
          "rowStart": 5,
          "rowEnd": 7
        },
        {
          "colStart": 5,
          "colEnd": 9,
          "rowStart": 5,
          "rowEnd": 7
        },
        {
          "colStart": 9,
          "colEnd": 13,
          "rowStart": 5,
          "rowEnd": 7
        }
      ]
  }
];

