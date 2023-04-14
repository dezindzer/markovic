$(document).mousemove(function(event){
        var mouseX = event.pageX-$(document).scrollLeft();
        var mouseY = event.pageY-$(document).scrollTop();
        if ($(document).width()-290 < mouseX) {
            $('#col2').css({
                left:   mouseX-290
            });
        } else {
            $('#col2').css({
                left:   mouseX+15
            });
        }
        if ($(window).height()-100 < mouseY) {
            $('#col2').css({
                top:   mouseY-80
            });
        } else {
            $('#col2').css({
                top:   mouseY+15
            });
        }
    });

    var
            width = 900,
            height = 900,
            radius = 50 * Math.max(width, height) / 100,
            x = d3.scale.linear().range([0, 2 * Math.PI]),
            y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, radius]),
            padding = 5,
            duration = 1500;

    var color = d3.scale.category20();

    var div = d3.select("#vis");

    var content = d3.select("#col2");

    //div.select("img").remove();

    var svg = d3.select("#vis")
            .append("svg")
            .attr("width", width + padding * 2)
            .attr("height", height + padding * 2)
            .append("g")
            .attr("transform", "translate(" + [radius + padding, radius + padding] + ")");

    //div.append("p")
    // .attr("id", "intro")
    //.text("Click to zoom!");

    var partition = d3.layout.partition()
            .value(function(d)
            {
                return 50;//d.appropriation14;
            });

    var arc = d3.svg.arc()
            .startAngle(function(d)
            {
                return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
            })

            .endAngle(function(d)
            {
                return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
            })

            .innerRadius(function(d)
            {
                return Math.max(0, y(d.y));
            })

            .outerRadius(function(d)
            {
                return Math.max(0, y(d.y + d.dy));
            });

    // d3.json("budget.json", function(json) {
    //   var nodes = partition.nodes({children: json});


    var minY = 0;
    var maxY = 2;

    var malegradient = svg
            .append("linearGradient")
            .attr("y1", minY)
            .attr("y2", maxY)
            .attr("x1", "0")
            .attr("x2", "0")
            .attr("id", "malegradient")


    malegradient
            .append("stop")
            .attr("offset", "0")
            .attr("stop-color", "#5883c3")

    malegradient
            .append("stop")
            .attr("offset", "0.5")
            .attr("stop-color", "#5883c3")

    var femalegradient = svg
            .append("linearGradient")
            .attr("y1", minY)
            .attr("y2", maxY)
            .attr("x1", "0")
            .attr("x2", "0")
            .attr("id", "femalegradient")


    femalegradient
            .append("stop")
            .attr("offset", "0")
            .attr("stop-color", "#f7a6a6")

    femalegradient
            .append("stop")
            .attr("offset", "0.5")
            .attr("stop-color", "#f7a6a6")

     var singlegradient = svg
            .append("linearGradient")
            .attr("y1", minY)
            .attr("y2", maxY)
            .attr("x1", "0")
            .attr("x2", "0")
            .attr("id", "singlegradient")


    singlegradient
            .append("stop")
            .attr("offset", "0")
            .attr("stop-color", "#3377ff")

    singlegradient
            .append("stop")
            .attr("offset", "0.5")
            .attr("stop-color", "#0d5eff")

    var currentdepth = 0;
    var currentobject = 0;
    var currentid = 0;
    var rootobject = 0;


    function updateGraph(path) {
         $.ajax({
            url: path,
            cache: false,
            dataType: "text",
            success: function(data) {
                if (data.trim().length > 0) {
                    buildGraph(data);
                }
            }
        });
    }
    function buildGraph(jsondata) {

        var root = JSON.parse(jsondata);

        div.select("svg").selectAll("path").remove();
        div.select("svg").selectAll("text").remove();


        // var path = vis.selectAll("path").data(nodes);
        //   path.enter().append("path")
        var path = svg.selectAll("path")
                .data(partition.nodes(root))
                .enter()
                .append("path")
                .attr("id", function(d, i)
                {
                    if (i == 0) {
                        rootobject = d;
                    }
                    if (d.id == currentid) {
                        currentobject = d;
                    }
                    return "path-" + i;
                })

                .attr("d", arc)
                .attr("fill-rule", "evenodd")
                .on("click", click)
                .on("mouseover", mouseover)
                .on("mouseout", mouseout);

        //add text
        var text = svg.selectAll("text")
                .data(partition.nodes(root));

        var textEnter = text
                .enter()
                .append("text")
            //starting opacity
            //hides all those but the inner ring
            //color fill
            //#000000 is black
                .style("font-size", "10px")
                .style("fill", "#000000")
                .attr("text-anchor", function(d)
                {
                    return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
                })

                .attr("dy", ".2em")
            //checks for multiline names
            .attr("transform", function(d)
                {
                    var multiline = (d.name || "")
                            .split(" ")
                            .length > 1.5, angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90, rotate = angle + ( multiline ? -.5 : 0);

                    return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
                })
                

        //1st row of text
        textEnter
                .append("tspan")
                .attr("x", 0)
                .text(function(d)
                {
                    txt = d.name.split(" ");
                    for(var i = txt.length - 1; i >= 0; i--) {
                        if (txt[i].length < 4 && i != 0) {
                            txt[i-1] += txt[i];
                            txt.splice(i, 1);
                        }

                    }
                    return d.depth ? txt[0] : "";
                });

        //2nd row of text
        textEnter
                .append("tspan")
                .attr("x", 0)
                .attr("dy", ".9em")
                .text(function(d)
                {
                    txt = d.name.split(" ");
                    for(var i = txt.length - 1; i >= 0; i--) {
                        if (txt[i].length < 4 && i != 0) {
                            txt[i-1] += txt[i];
                            txt.splice(i, 1);
                        }

                    }
                    return d.depth ? txt[1] || "" : "";
                });

        //3rd row
        textEnter
                .append("tspan")
                .attr("x", 0)
                .attr("dy", ".9em")
                .text(function(d)
                {
                    txt = d.name.split(" ");
                    for(var i = txt.length - 1; i >= 0; i--) {
                        if (txt[i].length < 4 && i != 0) {
                            txt[i-1] += txt[i];
                            txt.splice(i, 1);
                        }

                    }
                    return d.depth ? txt[2] || "" : "";
                });

        //fourth row (if necessary)
        textEnter
                .append("tspan")
                .attr("x", 0)
                .attr("dy", ".9em")
                .text(function(d)
                {
                    txt = d.name.split(" ");
                    for(var i = txt.length - 1; i >= 0; i--) {
                        if (txt[i].length < 4 && i != 0) {
                            txt[i-1] += txt[i];
                            txt.splice(i, 1);
                        }

                    }
                    return d.depth ? txt[3] || "" : "";
                });

        optionChange();  //Update colors and text visibility
        if (currentid != 0) {
            tweenGraph(0, currentobject);
        }


        //click function
        function click(d)
        {
            currentid = d.id;

            if (d.gd == 0) {
                return
            } else {

                d3.selectAll("text")
                .style("pointer-events", "none")
                .style("fill-opacity", 0);
                currentdepth = d.depth;
                //duration is predefined above at 1500 (1.75 seconds)
                tweenGraph(duration, d);
                setTimeout(optionChange, duration);
            }
        }


        //mouseover function which will send the values to the legend
        function mouseover(d)
        {
            if (d.gd == 0) {
                document.body.style.cursor = 'default';
                document.getElementById('col2').style.display='none';

            } else {
                document.body.style.cursor = 'pointer';
                document.getElementById('col2').style.display='inline';
            }
            content.append("p")
                    .attr("id", "current")
                    .text(d.name)

        }

        //mouseout function which removes the values and replaces them with a blank space
        function mouseout(d)
        {
            content.html(' ');
            document.getElementById('col2').style.display='none';
            document.body.style.cursor = 'default';
        }

        //var svgtext = "<svg>" +document.getElementsByTagName("svg")[0].innerHTML +  "</svg>"

    }

    function resetZoom() {
        currentid = rootobject.id;
        currentdepth = 0;
        tweenGraph(duration, rootobject);
        optionChange();
    }

    function tweenGraph(dur, d) {

        var path = svg.selectAll("path");


        path
                .transition()

                .duration(dur)
                .attrTween("d", arcTween(d));

        var text = svg.selectAll("text");

        // Somewhat of a hack as it relies on arcTween updating the scales.
        text
                .style("visibility", function(e)
                {
                    return isParentOf(d, e) ? null : d3.select(this).style("visibility");
                })


                .transition()
                .duration(dur)
                .attrTween("text-anchor", function(d)
                {
                    return function()

                    {
                        return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
                    };
                })

                .attrTween("transform", function(d)
                {
                    var multiline = (d.name || "")
                            .split(" ")
                            .length > 1.5;

                    return function()
                    {
                        var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90, rotate = angle + ( multiline ? -.5 : 0);
                        return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
                    };
                })

                .each("end", function(e)
                {
                    d3.select(this)
                            .style("visibility", isParentOf(d, e) ? null : "hidden");
                });
    }

    d3.selectAll("input").on("change", function change()
    {
        optionChange();
    });

    function textVisible(d) {
        if (document.getElementsByName('mode')[1].checked)
        {
            return 1;
        }
        else if (document.getElementsByName('mode')[0].checked) {
            return 0;
        }
        else
        {
            //if the depth is 1, innermost, then it's seen
            if (d.depth == 0) {
                return 0;
            }
            else if (d.depth == currentdepth || d.depth == currentdepth+1)
            {
                return 1;
            }
            //else the depth is not one, then it's hidden
            else
            {
                return 0;
            }
        }
    }

    function getColor(d) {
        if (d.gender == "male") {
            return "url(#malegradient)";
        } else {
            return "url(#femalegradient)";
        }

    }

    function optionChange() {
        d3.selectAll("text")
                .style("pointer-events", "none")
                .style("fill-opacity", function(d)
                {
                    return textVisible(d);
                });


        d3.selectAll("path")
                .attr("fill-rule", "evenodd")
                .style("fill", function(d)
                {
                    return getColor(d);
                })
    }


    function isParentOf(p, c)
    {
        if (p === c)
            return true;
        if (p.children)
        {
            return p.children.some(function(d)
            {
                return isParentOf(d, c);
            });
        }
        return false;
    }


    function arcTween(d)
    {
        var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]), yd = d3.interpolate(y.domain(), [d.y, 1]), yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
        return function(d, i)
        {
            return i ? function(t)
            {
                return arc(d);
            } : function(t)
            {
                x.domain(xd(t));
                y.domain(yd(t)).range(yr(t));
                return arc(d);
            };
        };
    }

    function maxY(d)
    {
        return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
    }

    // http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
    function brightness(rgb)
    {
        return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
    }
    window.onload = function () {
        updateGraph("http://markovic.ml/json.json");
    }
