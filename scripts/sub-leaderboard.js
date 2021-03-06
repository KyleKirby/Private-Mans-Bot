$(document).ready(function () {
    $('.leaderboardTable').DataTable(
        {
            "autoWidth": false,
            "bSortClasses": false,
            "dom": "rftipl",
            "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
            "columnDefs": [
                { "orderable": false, "targets": 1 },
                { "searchable": false, "targets": "nosearch" }
            ],
            "language": {
                "search": "_INPUT_",
                "searchPlaceholder": "Search By Name"
            }
        });
});
