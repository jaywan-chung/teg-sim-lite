function switchMenu() {
    $('#section-about').css("display", "none");
    $('#section-thermoelectricity').css("display", "none");
    $('#section-develop-history').css("display", "none");
    $('#section-publications').css("display", "none");
    $('#section-link').css("display", "none");
    $('#section-contact').css("display", "none");

    if (this.checked) {
        switch(this.id) {
            case 'item-about':
                $('#section-about').css("display", "block");
                break;
            case 'item-thermoelectricity':
                $('#section-thermoelectricity').css("display", "block");
                break;
            case 'item-develop-history':
                $('#section-develop-history').css("display", "block");
                break;
            case 'item-publications':
                $('#section-publications').css("display", "block");
                break;
            case 'item-link':
                $('#section-link').css("display", "block");
                break;
            case 'item-contact':
                $('#section-contact').css("display", "block");
                break;
            default:
                break;
        }
    }
}

$(function() {
    //switchMenu();
    document.getElementById('item-about').onclick = switchMenu;
    document.getElementById('item-thermoelectricity').onclick = switchMenu;
    document.getElementById('item-develop-history').onclick = switchMenu;
    document.getElementById('item-publications').onclick = switchMenu;
    document.getElementById('item-link').onclick = switchMenu;
    document.getElementById('item-contact').onclick= switchMenu;
});