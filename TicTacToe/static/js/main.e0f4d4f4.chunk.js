(this.webpackJsonpreact_tic_tac_toe=this.webpackJsonpreact_tic_tac_toe||[]).push([[0],{11:function(e,a,r){"use strict";r.r(a);var t=r(1),c=r.n(t),n=r(4),i=r.n(n),o=(r(9),r(2)),s=r(0),d=function(e){var a=e.title;return Object(s.jsx)("h1",{className:"header",children:a})},m=function(e){var a,r=e.coordinates,t=e.gameGrid,c=e.gameOver,n=e.changeGameGrid;return 0===t[r[0]][r[1]]?a="":1===t[r[0]][r[1]]?a="X":2===t[r[0]][r[1]]&&(a="O"),Object(s.jsx)("div",{className:"gridBox",onClick:function(){c||0===t[r[0]][r[1]]&&n(r[0],r[1])},children:a})},g=function(e){var a=e.gameOver,r=e.restartGame,t=e.gameGrid,c=e.changeGameGrid;return Object(s.jsxs)("div",{className:"ticTacToeFrame",onClick:function(){a&&r()},children:[Object(s.jsx)(m,{coordinates:[0,0],gameGrid:t,gameOver:a,changeGameGrid:c}),Object(s.jsx)(m,{coordinates:[0,1],gameGrid:t,gameOver:a,changeGameGrid:c}),Object(s.jsx)(m,{coordinates:[0,2],gameGrid:t,gameOver:a,changeGameGrid:c}),Object(s.jsx)(m,{coordinates:[1,0],gameGrid:t,gameOver:a,changeGameGrid:c}),Object(s.jsx)(m,{coordinates:[1,1],gameGrid:t,gameOver:a,changeGameGrid:c}),Object(s.jsx)(m,{coordinates:[1,2],gameGrid:t,gameOver:a,changeGameGrid:c}),Object(s.jsx)(m,{coordinates:[2,0],gameGrid:t,gameOver:a,changeGameGrid:c}),Object(s.jsx)(m,{coordinates:[2,1],gameGrid:t,gameOver:a,changeGameGrid:c}),Object(s.jsx)(m,{coordinates:[2,2],gameGrid:t,gameOver:a,changeGameGrid:c})]})},j=function(){var e=Object(t.useState)([[0,0,0],[0,0,0],[0,0,0]]),a=Object(o.a)(e,2),r=a[0],c=a[1],n=Object(t.useState)(!0),i=Object(o.a)(n,2),m=i[0],j=i[1],G=Object(t.useState)(!1),O=Object(o.a)(G,2),b=O[0],v=O[1];return Object(s.jsxs)("div",{className:"frame",children:[Object(s.jsx)(d,{title:"Tic Tac Toe"}),Object(s.jsx)(g,{gameOver:b,restartGame:function(){c([[0,0,0],[0,0,0],[0,0,0]]),j(!0),v(!1)},gameGrid:r,changeGameGrid:function(e,a){var t=r;t[e][a]=m?1:2,c(t);for(var n=!1,i=r[e][a],o=0;o<3;o++)if(i===r[0][o]&&i===r[1][o]&&i===r[2][o]){n=!0;break}for(var s=0;s<3;s++)if(i===r[s][0]&&i===r[s][1]&&i===r[s][2]){n=!0;break}if(i===r[0][0]&&i===r[1][1]&&i===r[2][2]&&(n=!0),i===r[2][0]&&i===r[1][1]&&i===r[0][2]&&(n=!0),n&&(console.log("'".concat(m?"X":"O","' won!")),v(!0)),!n){for(var d=!0,g=0;g<3;g++)for(var G=0;G<3;G++)if(0===r[g][G]){d=!1;break}d&&(console.log("Draw!"),v(!0))}j(!m)},xTurn:m})]})},G=function(e){e&&e instanceof Function&&r.e(3).then(r.bind(null,12)).then((function(a){var r=a.getCLS,t=a.getFID,c=a.getFCP,n=a.getLCP,i=a.getTTFB;r(e),t(e),c(e),n(e),i(e)}))};i.a.render(Object(s.jsx)(c.a.StrictMode,{children:Object(s.jsx)(j,{})}),document.getElementById("root")),G()},9:function(e,a,r){}},[[11,1,2]]]);
//# sourceMappingURL=main.e0f4d4f4.chunk.js.map