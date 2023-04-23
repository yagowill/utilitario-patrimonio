const input = document.getElementById('text');
const copiar = document.getElementById('clipboard')

input.addEventListener("input", () => {
    const rps = document.getElementById('text').value.trim();
    const textArea = document.getElementById('floatingTextarea2');
    const infos = document.getElementById('info');

    if(rps != "") {
        let arrRps = rps.split(" ");
        textArea.innerHTML = Array(arrRps);
        console.log(typeof(arrRps))
        let qtdRp = rps.split(" ").length
        let rpsUniq = new Set(arrRps)
        let qtdUniqQtd = rpsUniq.size
        let duplicadosQtd = qtdRp - qtdUniqQtd;
        let duplicados = arrRps;
        rpsUniq.forEach(el => duplicados.splice(duplicados.indexOf(el), 1));

        infos.innerHTML = `<strong>Quantidade únicos: <span style="color:green;">${qtdUniqQtd}</span></strong`;
        if(duplicadosQtd > 0) {
            infos.innerHTML += `<strong><br><span style="color:red;">${duplicadosQtd}</span> duplicados encontrados<br>
            Patrimônios duplicados: <span style="color:red;">${duplicados}</span></strong>`;
        }
    } else {infos.innerHTML = ""; textArea.innerText = "";};
}, false);

copiar.addEventListener("click", () => {
    const textArea = document.getElementById('floatingTextarea2').value;
    navigator.clipboard.writeText(textArea).then();
    
})
