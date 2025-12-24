
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export const Visualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 150;
    
    svg.selectAll("*").remove();

    const data = d3.range(20).map(i => ({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.3 + Math.random() * 0.7,
      size: 1.5 + Math.random() * 3,
      color: d3.interpolateTurbo(Math.random())
    }));

    const nodes = svg.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("r", d => d.size)
      .attr("fill", d => d.color)
      .attr("opacity", 0.4);

    const timer = d3.timer(() => {
      nodes.attr("cx", d => {
        d.x += d.speed;
        if (d.x > width) d.x = -10;
        return d.x;
      }).attr("cy", d => d.y);
    });

    return () => timer.stop();
  }, []);

  return (
    <div className="w-full h-screen fixed inset-0 overflow-hidden opacity-10 pointer-events-none -z-10">
      <svg ref={svgRef} viewBox="0 0 800 150" className="w-full h-full" preserveAspectRatio="xMidYMid slice" />
    </div>
  );
};
