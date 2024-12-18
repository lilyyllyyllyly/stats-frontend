// Main file that displays the graph

import "./index.css";

import { useEffect } from "react";
import Graph from "graphology";
import { parse } from "graphology-gexf";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { useLayoutCircular } from "@react-sigma/layout-circular";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { createNodeImageProgram } from "@sigma/node-image";
import { getColor, getNodeSize, getNodeColor } from "./Utils";
import { Complete } from "./components/Controls";

// 100v(h/w) is 100% of the viewport height/widths
const sigmaStyle = { height: "100vh", width: "100vw" };

// LoadGraph component that loads the graph from the GEXF file
export const LoadGraph = () => {
  const loadGraph = useLoadGraph(); // hook to load the graph
  const { assign } = useLayoutCircular(); // hook to assign the layout (needed for forceAtlas2)

  useEffect(() => {
    const gexfUrl = import.meta.env.VITE_GEXF_URL; // get the GEXF URL from the environment variables
    if (!gexfUrl) {
      throw new Error("REACT_APP_GEXF_URL environment variable not set");
    }
    fetch(gexfUrl) // fetch the GEXF file
      .then((res) => res.text())
      .then((gexf) => {
        const graph = parse(Graph, gexf); // parse the GEXF file to a graph

        // set 0,0 for all nodes
        // this is needed for circular layout
        graph.forEachNode((node) => {
          graph.setNodeAttribute(node, "x", 0);
          graph.setNodeAttribute(node, "y", 0);
        });

        // find all users called "Anonymous User" and change the label to nothing and change the icon to ./Question_Mark.svg
        graph.forEachNode((node) => {
          if (graph.getNodeAttribute(node, "label") === "Anonymous User") {
            graph.setNodeAttribute(node, "label", "");
            graph.setNodeAttribute(node, "type", "image");
            graph.setNodeAttribute(node, "image", "./QuestionMark.svg");
          }
        });

        // remove any nodes that have no edges
        // this way there are no nodes that are not connected to anything (this causes issues with forceAtlas2)
        graph.forEachNode((node) => {
          if (graph.degree(node) === 0) {
            graph.dropNode(node);
          }
        });

        // find min and max weight in edges
        let minWeight = Infinity;
        let maxWeight = -Infinity;
        graph.forEachEdge((edge) => {
          const weight = graph.getEdgeAttribute(edge, "weight");
          if (weight < minWeight) {
            minWeight = weight;
          }
          if (weight > maxWeight) {
            maxWeight = weight;
          }
        });

        // map weight to size of edges
        const minEdgeMult = 0.1; // minimum multiplier from weight to size
        const maxEdgeMult = 10; // maximum multiplier from weight to size
        graph.forEachEdge((edge) => {
          const weight = graph.getEdgeAttribute(edge, "weight");
          const size =
            minEdgeMult +
            ((maxEdgeMult - minEdgeMult) * (weight - minWeight)) /
              (maxWeight - minWeight);
          graph.setEdgeAttribute(edge, "size", size);
        });

        // set color of edges
        const alphaMin = 0.1; // minimum alpha value
        const alphaMax = 1; // maximum alpha value
        // alpha can be done via rgba
        graph.forEachEdge((edge) => {
          const weight = graph.getEdgeAttribute(edge, "weight");
          const alpha =
            alphaMin +
            ((alphaMax - alphaMin) * (weight - minWeight)) /
              (maxWeight - minWeight);
          graph.setEdgeAttribute(
            edge,
            "color",
            getColor(weight, minWeight, maxWeight) +
              Math.floor(alpha * 255).toString(16)
          );
        });

        // set size of nodes based on weighted degree
        graph.forEachNode((node) => {
          const size = getNodeSize(graph, node);
          graph.setNodeAttribute(node, "size", size);
        });

        // set color of nodes based on weighted degree
        graph.forEachNode((node) => {
          const color = getNodeColor(graph, node);
          graph.setNodeAttribute(node, "color", color);
        });

        loadGraph(graph); // load the graph to the sigma container
        assign(); // assign the circular layout

        forceAtlas2.assign(graph, {
          // assign the forceAtlas2 layout
          iterations: 1000,
          settings: {
            gravity: 0.5,
            scalingRatio: 500,
            edgeWeightInfluence: 1.5,
          },
        });
      });
  }, [loadGraph, assign]);

  return null;
};

// Component that displays the graph
export const DisplayGraph = () => {
  return (
    <SigmaContainer
      style={sigmaStyle} // set the style of the sigma container
      settings={{ nodeProgramClasses: { image: createNodeImageProgram() } }} // for image nodes
    >
      <LoadGraph />
      <Complete />
    </SigmaContainer>
  );
};
