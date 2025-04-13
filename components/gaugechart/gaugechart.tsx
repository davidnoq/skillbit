// DonutChart.tsx
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface DonutChartProps {
  percent: number; // percent from 0 to 10
}

const DonutChart: React.FC<DonutChartProps> = ({ percent }) => {
  const chartRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const duration = 1500;
    const transition = 200;
    const width = 150;
    const height = 150;
    const thickness = 30;
    const anglesRange = 0.75 * Math.PI;
    const radius = Math.min(width, height) / 2;
    const maxValue = 30;
    const colors = ["#3949ab", "#fff"];

    const calcPercent = (value: number) => [value, maxValue - value];

    const dataset = {
      lower: calcPercent(0),
      upper: calcPercent(percent),
    };

    const arc = d3
      .arc<d3.PieArcDatum<number>>()
      .innerRadius(radius - thickness)
      .outerRadius(radius);

    const pie = d3
      .pie<number>()
      .value((d) => d)
      .sort(null)
      .startAngle(-anglesRange)
      .endAngle(anglesRange);

    d3.select(chartRef.current).selectAll("*").remove(); // Clear old SVG

    const svg = d3
      .select(chartRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    let path = svg
      .selectAll("path")
      .data(pie(dataset.lower))
      .enter()
      .append("path")
      .attr("fill", "#fff")
      .attr("d", arc as any)
      .each(function (d) {
        // @ts-ignore
        this._current = d;
      });

    const text = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("fill", "#fff") // <-- white text
      .style("font-family", "h1")
      .style("font-size", "24px");

    const progress = 0;

    setTimeout(() => {
      path = path.data(pie(dataset.upper));
      path
        .transition()
        .duration(duration)
        .attrTween("d", function (a, index) {
          const self = this;
          const i = d3.interpolate((this as any)._current, a);
          const i2 = d3.interpolateNumber(progress, percent);
          (this as any)._current = i(0);

          return function (t) {
            const currentValue = i2(t);
            const displayPercent = Math.round((currentValue / maxValue) * 100);
            d3.select(self).attr(
              "fill",
              index !== 0
                ? "#fff"
                : currentValue / maxValue >= 0.7
                ? "#43a047"
                : "#f44336"
            );
            text.text(displayPercent + "%");
            return arc(i(t))!;
          };
        });
    }, transition);
  }, [percent]);

  return <svg ref={chartRef} />;
};

export default DonutChart;
